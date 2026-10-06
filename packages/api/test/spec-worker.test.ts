import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taskSpecWorkspaces } from "../src/infra/database/schema";
import { SpecRuntimeError } from "../src/infra/spec/compozy/compozyErrors";
import { closeTaskFixture } from "./task-api-support";
import { specTask } from "./spec-support";
import { attemptRow, fakeDeps, pins } from "./spec-worker-support";
import { startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

describe("spec worker dispatch", () => {
  it("binds the workspace and session before submitting the stored prompt identity", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const row = await attemptRow(setup);
    const { controller, calls, runtime } = fakeDeps(setup);
    const claim = await controller.tick();
    expect(claim).toMatchObject({ fence: 1, state: "dispatching" });
    expect(calls.indexOf("create")).toBeLessThan(calls.indexOf("submit"));
    expect(runtime.submit).toHaveBeenCalledWith(expect.objectContaining({ messageId: row.promptMessageId, idempotencyKey: row.promptIdempotencyKey }));
    const after = await attemptRow(setup);
    expect(after).toMatchObject({ state: "running", runtimeSessionId: "s1", runtimeWorkspaceId: "w1", runtimeTurnId: "turn-1" });
    expect((await setup.database.select().from(taskSpecWorkspaces))[0]).toMatchObject({ runnerId: "runner-1", baseCommit: "a".repeat(40) });
  });

  it("IT-202 keeps outcome_unknown and sends no prompt when session reconciliation is ambiguous", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { controller, runtime } = fakeDeps(setup);
    runtime.create.mockImplementation(async () => { throw new SpecRuntimeError("outcome_unknown", true); });
    await controller.tick();
    expect(runtime.submit).not.toHaveBeenCalled();
    expect(await attemptRow(setup)).toMatchObject({ state: "reconciling", terminalReason: "outcome_unknown" });
  });

  it("IT-203 retains the prompt identity on an indeterminate conflict and admits no competing attempt", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { controller, runtime } = fakeDeps(setup);
    runtime.submit.mockResolvedValue({ status: "conflict", messageId: "m", idempotencyKey: "k", turnId: null, replayed: false });
    await controller.tick();
    const row = await attemptRow(setup);
    expect(row).toMatchObject({ state: "reconciling", terminalReason: "outcome_unknown", runtimeSessionId: "s1" });
    await expect(setup.database.execute(`INSERT INTO task_spec_attempts (workflow_id, stage, attempt_number, kind, source_attempt_id, input, input_hash) VALUES ('${row.workflowId}', 'prd', 2, 'retry', '${row.id}', '{}', '${"a".repeat(64)}')` as never)).rejects.toThrow();
  });

  it("IT-233 records access_revoked before any workspace or runtime side effect", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { controller, access, workspaces, runtime } = fakeDeps(setup);
    access.check.mockResolvedValue("revoked" as never);
    await controller.tick();
    expect(workspaces.prepare).not.toHaveBeenCalled();
    expect(runtime.create).not.toHaveBeenCalled();
    expect((await attemptRow(setup)).terminalReason === "access_revoked" || (await attemptRow(setup)).state === "stopping").toBe(true);
  });

  it("IT-113 fails with context_limit when required inline context exceeds the bound", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const row = await attemptRow(setup);
    await setup.database.execute(`UPDATE task_spec_attempts SET input = jsonb_set(input, '{adjustment}', to_jsonb(repeat('a', 262145))) WHERE id = '${row.id}'` as never);
    const { controller, runtime, workspaces } = fakeDeps(setup);
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "failed", terminalReason: "context_limit" });
    expect(runtime.create).not.toHaveBeenCalled();
    expect(workspaces.prepare).not.toHaveBeenCalled();
  });

  it("IT-230 points the runtime at complete read-only approved inputs instead of inlining them", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const big = { path: "_prd.md", role: "prd", sha256: "a".repeat(64), bytes: 400_000 };
    const { controller, runtime } = fakeDeps(setup, { upstream: async () => [big] });
    await controller.tick();
    const message = (runtime.submit.mock.calls[0] as unknown as [{ message: string }])[0].message;
    expect(message).toContain("inputs/_prd.md");
    expect(Buffer.byteLength(message)).toBeLessThan(10_000);
  });

  it("IT-069 fails dispatch with artifact_conflict when approved bytes drifted", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { controller, workspaces, runtime } = fakeDeps(setup);
    workspaces.verify.mockImplementation(async () => { throw new (await import("../src/application/services/tasks/taskErrors")).TaskError("artifact_conflict"); });
    await controller.tick();
    expect(await attemptRow(setup)).toMatchObject({ state: "failed", terminalReason: "artifact_conflict" });
    expect(runtime.create).not.toHaveBeenCalled();
  });

  it("IT-119 does not claim work when the declared pins differ from the accepted pins", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { controller, deps } = fakeDeps(setup);
    deps.settings.runtime.declared = { ...pins, bundleSha256: "c".repeat(64) };
    expect(await controller.tick()).toBeNull();
    expect((await attemptRow(setup)).state).toBe("queued");
  });
});
