import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taskSpecCommands, taskSpecEvents, taskSpecInteractions } from "../src/infra/database/schema";
import type { RuntimeResolution } from "../src/application/spec/specRuntimeGateway";
import { mapResolution } from "../src/application/spec/specRuntimeOutcomes";
import { closeTaskFixture } from "./task-api-support";
import { specCaller, specScope, specTask } from "./spec-support";
import { attemptRow, fakeDeps } from "./spec-worker-support";
import { seedInteraction, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

async function answered(kind: "question" | "permission", decision = "allow_once") {
  const setup = await specTask();
  const started = await startWorkflow(setup);
  const item = await seedInteraction(setup, started, { kind });
  const base = { ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: 1, attemptId: started.attemptId, interactionId: item.id };
  const caller = specCaller(setup);
  if (kind === "permission") await caller.permission({ ...base, actionDigest: item.targetDigest!, decision } as never);
  else await caller.answer({ ...base, response: { text: "Thirty days" } });
  const harness = fakeDeps(setup);
  const deliver = async (resolution: RuntimeResolution) => { harness.runtime.resolve.mockResolvedValue(resolution as never); await harness.controller.tick(); };
  return { setup, started, item, deliver, ...harness };
}
const interaction = async (setup: Awaited<ReturnType<typeof answered>>["setup"]) => (await setup.database.select().from(taskSpecInteractions))[0]!;
const command = async (setup: Awaited<ReturnType<typeof answered>>["setup"]) => (await setup.database.select().from(taskSpecCommands)).find((row) => row.action !== "spec.start")!;

describe("interaction delivery", () => {
  it("marks a saved answer delivered only after the runtime proves it and resumes the run", async () => {
    const { setup, deliver, runtime } = await answered("question");
    expect((await interaction(setup)).delivery).toBe("pending");
    await deliver(mapResolution("answered", "Thirty days"));
    expect(runtime.resolve).toHaveBeenCalledWith(expect.objectContaining({ kind: "question", text: "Thirty days" }));
    expect(await interaction(setup)).toMatchObject({ delivery: "delivered" });
    expect(await command(setup)).toMatchObject({ status: "applied", deliveryStatus: "delivered", reason: null });
    expect((await attemptRow(setup)).state).toBe("running");
  });

  it("IT-194 keeps a queue-full permission pending with interaction_queue_full and no applied outcome", async () => {
    const { setup, deliver } = await answered("permission");
    await deliver(mapResolution("queue-full"));
    expect(await interaction(setup)).toMatchObject({ status: "resolved", delivery: "pending" });
    expect(await command(setup)).toMatchObject({ status: "accepted", deliveryStatus: "pending", reason: "interaction_queue_full" });
    await deliver(mapResolution("applied"));
    expect(await command(setup)).toMatchObject({ status: "applied", reason: null });
  });

  it("IT-209 persists the runtime winner without broadening the grant when another decision already won", async () => {
    const { setup, deliver } = await answered("permission", "allow_once");
    await deliver(mapResolution("already-resolved", "deny_once"));
    const saved = await interaction(setup);
    expect(saved).toMatchObject({ delivery: "inactive" });
    expect(saved.response).toMatchObject({ decision: "allow_once", runtimeWinner: "deny_once" });
    expect((await command(setup)).status).toBe("accepted");
  });

  it("labels an answer orphaned when its live provider turn is gone after a restart", async () => {
    const { setup, deliver } = await answered("question");
    await deliver(mapResolution("resolved-after-restart"));
    expect(await interaction(setup)).toMatchObject({ delivery: "orphaned" });
    expect(await command(setup)).toMatchObject({ status: "accepted", deliveryStatus: "orphaned" });
  });

  it("retains an unknown outcome instead of claiming delivery", async () => {
    const { setup, deliver } = await answered("question");
    await deliver(mapResolution("???"));
    expect(await interaction(setup)).toMatchObject({ delivery: "unknown" });
    expect(await command(setup)).toMatchObject({ deliveryStatus: "unknown", reason: "outcome_unknown" });
  });

  it("IT-039 turns a pending question historical when the cancellation is confirmed", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    await seedInteraction(setup, started);
    const { deps } = fakeDeps(setup);
    const claim = (await deps.dao.claim({ owner: "w", now: new Date(), maxActive: 2 }))!;
    await deps.dao.settle(claim, { state: "canceled", reason: null });
    expect(await interaction(setup)).toMatchObject({ status: "superseded", delivery: "inactive" });
    expect((await specCaller(setup).byTask(specScope(setup))).pendingInteractions).toEqual([]);
    expect((await setup.database.select().from(taskSpecEvents)).map((saved) => saved.kind)).toContain("attempt.canceled");
  });
});

describe("interaction synchronization", () => {
  it("saves pending runtime interactions, flags incomplete ones and moves the run to waiting", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    await setup.database.execute(`UPDATE task_spec_attempts SET state = 'running', runtime_workspace_id = 'w1', runtime_session_id = 's1', runtime_turn_id = 'turn-1' WHERE id = '${started.attemptId}'` as never);
    const { controller, runtime } = fakeDeps(setup);
    runtime.interactions.mockResolvedValue([{ id: "i1", providerRequestId: "r1", turnId: "turn-1", kind: "question", status: "pending", title: "Qual prazo?", choices: ["Thirty days", "Ninety days"], decisions: [], toolId: null, resolution: null }, { id: "i2", providerRequestId: "r2", turnId: "turn-1", kind: "permission", status: "pending", title: "", choices: [], decisions: ["allow_always"], toolId: "write", resolution: null }] as never);
    await controller.tick();
    const rows = await setup.database.select().from(taskSpecInteractions);
    expect(rows.map((row) => row.status).sort()).toEqual(["blocked", "pending"]);
    expect((await attemptRow(setup)).state).toBe("waiting");
    const detail = await specCaller(setup).byTask(specScope(setup));
    expect(detail).toMatchObject({ state: "waiting_question", pendingInteractions: [expect.objectContaining({ description: "Qual prazo?", choices: ["Thirty days", "Ninety days"] })] });
    expect((await setup.database.select().from(taskSpecEvents)).some((saved) => saved.kind === "interaction.blocked")).toBe(true);
  });
});
