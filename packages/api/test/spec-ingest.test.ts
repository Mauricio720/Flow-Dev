import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taskSpecApprovals, taskSpecEvents, taskSpecPackages } from "../src/infra/database/schema";
import type { RuntimeEvent } from "../src/application/spec/specRuntimeGateway";
import { closeTaskFixture } from "./task-api-support";
import { fixtureManifest } from "./spec-fixtures";
import { specTask } from "./spec-support";
import { attemptRow, fakeDeps, setAttempt } from "./spec-worker-support";
import { startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

const event = (sequence: number, type = "agent_message", content: unknown = `mensagem ${sequence}`, id = `e${sequence}`): RuntimeEvent => ({ sequence, id, type, turnId: "turn-1", timestamp: "2026-10-05T10:00:00Z", content });
const bound = { state: "running", runtimeWorkspaceId: "w1", runtimeSessionId: "s1", runtimeTurnId: "turn-1" };

async function running(script: RuntimeEvent[]) {
  const setup = await specTask();
  await startWorkflow(setup);
  await setAttempt(setup, bound);
  const harness = fakeDeps(setup);
  const play = (list: RuntimeEvent[]) => harness.runtime.events.mockImplementation(((cursor: { afterSequence: number }) => (async function* () { for (const item of list.filter((candidate) => candidate.sequence > cursor.afterSequence)) yield item; })()) as never);
  play(script);
  return { setup, play, ...harness };
}
const savedEvents = async (setup: Awaited<ReturnType<typeof running>>["setup"]) => (await setup.database.select().from(taskSpecEvents)).sort((left, right) => left.sequence - right.sequence);

describe("runtime event ingestion", () => {
  it("IT-204 saves each accepted identity once across duplicate frames and reconnects", async () => {
    const { setup, controller, play } = await running([event(1), event(2), event(2), event(3)]);
    await controller.tick();
    expect((await savedEvents(setup)).map((saved) => saved.providerEventId)).toEqual(["e1", "e2", "e3"]);
    expect((await attemptRow(setup)).runtimeCursor).toBe("3");
    play([event(1), event(2), event(3), event(3, "agent_message", "repetido", "e3")]);
    await setAttempt(setup, { leaseExpiresAt: new Date(0) });
    await controller.tick();
    expect(await savedEvents(setup)).toHaveLength(3);
  });

  it("IT-205 keeps reconciling instead of claiming complete history when a sequence is missing", async () => {
    const { setup, controller } = await running([event(1), event(3)]);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "reconciling", attention: "replay_gap", runtimeCursor: "1" });
    expect(await savedEvents(setup)).toHaveLength(1);
  });

  it("IT-207 persists neither private reasoning nor credentials", async () => {
    const { setup, controller } = await running([event(1, "thought", "pensamento privado"), event(2, "tool_result", { tool_call_id: "c1", output: "Authorization: canary-secret", token: "canary-secret" })]);
    await controller.tick();
    const rows = JSON.stringify(await savedEvents(setup));
    expect(rows).not.toContain("pensamento privado");
    expect(rows).not.toContain("canary-secret");
    expect((await savedEvents(setup))).toHaveLength(1);
  });

  it("IT-028 goes through finalizing and fails with artifact_invalid when _tests.md is absent", async () => {
    const { setup, controller, workspaces } = await running([event(1), event(2, "done", { status: "completed" })]);
    workspaces.freeze.mockResolvedValue({ stage: "prd", entries: [{ path: "_prd.md", role: "prd", sha256: "a".repeat(64), bytes: 3 }], files: [{ path: "_prd.md", content: "abc" }], complete: false, missing: ["_user_stories.md"] } as never);
    await controller.tick();
    expect((await savedEvents(setup)).map((saved) => saved.kind).filter((kind) => kind.startsWith("attempt."))).toEqual(["attempt.finalizing", "attempt.failed"]);
    expect(await attemptRow(setup)).toMatchObject({ state: "failed", terminalReason: "artifact_invalid" });
    const packages = await setup.database.select().from(taskSpecPackages);
    expect(packages).toEqual([expect.objectContaining({ captureState: "partial" })]);
  });

  it("captures, installs and exposes a complete candidate as review-ready without approving it", async () => {
    const { setup, controller, workspaces, deps } = await running([event(1, "done", { status: "completed" })]);
    const claim = (await deps.dao.claim({ owner: "w", now: new Date("2030-01-01"), maxActive: 2 }))!;
    await deps.dao.bindWorkspace(claim, { repositoryGithubId: "202", repositoryNodeId: "R_202", baseCommit: "a".repeat(40), runnerId: "r", checkoutLocator: "/tmp/x", slug: `flow-${setup.taskId}` });
    await deps.dao.release(claim);
    await setAttempt(setup, { leaseExpiresAt: new Date(0) });
    workspaces.freeze.mockResolvedValue(fixtureManifest("prd-route", "prd") as never);
    workspaces.promote.mockResolvedValue({ entries: [], manifestHash: "c".repeat(64) } as never);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "completed" });
    expect(await setup.database.select().from(taskSpecPackages)).toEqual([expect.objectContaining({ captureState: "review_ready" })]);
    expect((await setup.database.select().from(taskSpecApprovals))).toHaveLength(0);
  });
});
