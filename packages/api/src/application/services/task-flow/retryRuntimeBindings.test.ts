import { describe, expect, it, vi } from "vitest";
import type { PlannedAction } from "../../database/dao/taskFlowDao";
import { retriedAction } from "./retryRuntimeBindings";
import type { LoopAdmission } from "./taskFlowPorts";

const CHOICE = { connectionId: "c1", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" };
const OTHER = { ...CHOICE, modelId: "gpt-5.6-terra" };
const REVIEW: PlannedAction = { position: 3, kind: "loop", loopName: "review-and-fix", loopVersion: "0", inputs: { task_name: "task-1" }, workspace: { kind: "local" }, bindings: [{ role: "worker", ...CHOICE }] };
const SPLIT = { reviewer_runtime: CHOICE, fixer_runtime: OTHER };

function loopsWith(live: { version: string; runtimeRoles: string[] } | null): LoopAdmission {
  return { admit: vi.fn(async () => undefined), current: vi.fn(async () => live) };
}

describe("retried action", () => {
  it("keeps the planned action when the retry does not choose runtimes again", async () => {
    const loops = loopsWith({ version: "1", runtimeRoles: ["reviewer_runtime", "fixer_runtime"] });
    expect(await retriedAction({ loops, taskId: "task-1", action: REVIEW })).toMatchObject({ loopVersion: "0", runtimeBindings: { worker: CHOICE } });
    expect(loops.current).not.toHaveBeenCalled();
  });

  it("follows the roles and the version of the Loop definition in use now", async () => {
    const loops = loopsWith({ version: "1", runtimeRoles: ["reviewer_runtime", "fixer_runtime"] });
    expect(await retriedAction({ loops, taskId: "task-1", action: REVIEW, bindings: SPLIT })).toMatchObject({ loopVersion: "1", runtimeBindings: SPLIT });
    await expect(retriedAction({ loops, taskId: "task-1", action: REVIEW, bindings: { worker: CHOICE } })).rejects.toMatchObject({ reason: "invalid_input" });
  });

  it("reads the definition of the workspace the action is moving to", async () => {
    const loops = loopsWith({ version: "1", runtimeRoles: ["reviewer_runtime", "fixer_runtime"] });
    await retriedAction({ loops, taskId: "task-1", action: REVIEW, bindings: SPLIT, workspace: { kind: "isolated" } });
    expect(loops.current).toHaveBeenCalledWith({ taskId: "task-1", action: expect.objectContaining({ workspace: { kind: "isolated" } }) });
  });

  it("falls back to the planned roles when the live definition cannot be read", async () => {
    const loops = loopsWith(null);
    expect(await retriedAction({ loops, taskId: "task-1", action: REVIEW, bindings: { worker: OTHER } })).toMatchObject({ loopVersion: "0", runtimeBindings: { worker: OTHER } });
    await expect(retriedAction({ loops, taskId: "task-1", action: REVIEW, bindings: SPLIT })).rejects.toMatchObject({ reason: "invalid_input" });
  });
});
