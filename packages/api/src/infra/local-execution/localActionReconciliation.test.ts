import { describe, expect, it, vi } from "vitest";
import type { LocalConnectorDao } from "../../application/database/dao/localConnectorDao";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import { LocalActionExecutor } from "./localActionExecutor";

const RUN_ID = "run-1";
const COMMAND_ID = "command-1";
const COMMAND_FENCE = 1;
const RECLAIMED_FENCE = 88;
const ACTIVITY_SEQUENCE = 58;

function setup(overrides: Record<string, unknown> = {}) {
  const command = { runId: RUN_ID, kind: "start", fence: COMMAND_FENCE, state: "accepted", ...overrides };
  const events = [{ sequence: ACTIVITY_SEQUENCE, kind: "activity", payload: { summary: "Verificando os testes", relativeFiles: [], at: "2026-10-08T20:41:23.694Z" }, payloadHash: "hash" }];
  const local = { commandForActor: vi.fn(async () => ({ command, events })) } as unknown as LocalConnectorDao;
  const flow = { taskContext: vi.fn(async () => ({ projectId: "project-1" })) } as never;
  const request = { snapshot: { workspace: { kind: "local" }, operatorId: "operator-1" }, run: { id: RUN_ID, taskId: "task-1", leaseFence: RECLAIMED_FENCE, runtime: { sessionId: COMMAND_ID } } } as unknown as ExecutionRequest;
  return { executor: new LocalActionExecutor({ local, flow, fallback: {} }), request, local };
}

describe("local command reconciliation", () => {
  it("reads the original command activity after the worker renews its lease", async () => {
    const { executor, request, local } = setup();
    await expect(executor.reconcile(request)).resolves.toMatchObject({ state: "running", runtimeEventSequence: ACTIVITY_SEQUENCE, activity: { preview: "Verificando os testes", at: "2026-10-08T20:41:23.694Z" } });
    expect(local.commandForActor).toHaveBeenCalledWith({ actorId: "operator-1", projectId: "project-1", commandId: COMMAND_ID });
  });

  it.each([{ runId: "another-run" }, { kind: "cancel" }])("rejects a command that is not the start of this run: %j", async (overrides) => {
    const { executor, request } = setup(overrides);
    await expect(executor.reconcile(request)).resolves.toEqual({ state: "unknown", code: "command_unavailable" });
  });

  it.each(["accepted", "completed"])("rejects a worker older than the command, including %s commands", async (state) => {
    const { executor, request } = setup({ fence: RECLAIMED_FENCE + 1, state });
    await expect(executor.reconcile(request)).resolves.toEqual({ state: "unknown", code: "stale_fence" });
  });
});
