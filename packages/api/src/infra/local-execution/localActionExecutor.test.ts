import { describe, expect, it, vi } from "vitest";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { LocalActionExecutor } from "./localActionExecutor";

describe("LocalActionExecutor", () => {
  it("UT-121 submits an explicit start command bound to the prepared target", async () => {
    const enqueueCommand = vi.fn(async (input: Record<string, unknown>) => ({ ...input, id: "command-1" } as never));
    const executor = createExecutor(enqueueCommand);
    await expect(executor.execute(request())).resolves.toMatchObject({ kind: "submitted", runtime: { sessionId: "command-1" } });
    expect(enqueueCommand).toHaveBeenCalledWith(expect.objectContaining({ kind: "start", machineId: "machine-1", target: expect.objectContaining({ checkoutHandle: "checkout-1" }), runId: "run-1" }));
  });

  it("maps persistent checkout contention to a blocked run without queuing another command", async () => {
    const enqueueCommand = vi.fn(async () => { throw new LocalExecutionError("checkout_busy"); });
    await expect(createExecutor(enqueueCommand).execute(request())).resolves.toEqual({ kind: "blocked", code: "checkout_busy" });
  });

  it("UT-127 retains a deterministic command identity when enqueue acknowledgment is uncertain", async () => {
    const enqueueCommand = vi.fn(async (_input: Record<string, unknown>) => { throw new LocalExecutionError("outcome_unknown"); });
    const result = await createExecutor(enqueueCommand).execute(request());
    expect(result).toMatchObject({ kind: "unknown", runtime: { sessionId: expect.any(String), runId: "run-1" } });
    expect(enqueueCommand.mock.calls[0]?.[0]).toMatchObject({ id: result.kind === "unknown" ? result.runtime?.sessionId : undefined, requestKey: result.kind === "unknown" ? result.runtime?.sessionId : undefined });
  });

  it("UT-128 leaves an accepted local command running independently of a browser session", async () => {
    const enqueueCommand = vi.fn(async () => ({ id: "command-accepted" } as never));
    await expect(createExecutor(enqueueCommand).execute(request())).resolves.toMatchObject({ kind: "submitted", runtime: { sessionId: "command-accepted" } });
    expect(enqueueCommand).toHaveBeenCalledTimes(1);
  });
});

function createExecutor(enqueueCommand: ReturnType<typeof vi.fn>) {
  const local = { enqueueCommand } as never;
  const flow = { taskContext: async () => ({ projectId: "project-1", source: { issueNumber: 1, title: "Issue", bodyMarkdown: "Details" } }) } as never;
  return new LocalActionExecutor({ local, flow, fallback: {} });
}

function request() {
  const snapshot = {
    kind: "create_spec",
    workspace: { kind: "local", target: { machineId: "machine-1", linkId: "link-1", linkRevision: 2, checkoutHandle: "checkout-1" } },
    localPreparation: { preparationId: "preparation-1", manifestHash: "a".repeat(64), checkoutDigest: "b".repeat(64), requiredGates: [] },
    operatorId: "operator-1",
    sourceSnapshotId: "source-1",
  };
  return { snapshot, run: { id: "run-1", taskId: "task-1", actionId: "action-1", leaseFence: 3 } } as never;
}
