import { describe, expect, it, vi } from "vitest";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { ExecutionCancelService } from "./executionCancelService";

const record: ExecutionRecord = { id: "execution", taskId: "task", planningDecisionId: "decision", route: "direct_execution", state: "in_progress", attempt: 1, idempotencyKey: "key", compozyWorkspaceId: "workspace", workTaskId: "remote-task", branch: "branch", specRound: 0, pullRequestUrl: null, detail: {}, failureCode: null, lastSyncedAt: null, startedBy: "actor", createdAt: new Date(), finishedAt: null };
const setup = (persisted: ExecutionRecord, reconciled = persisted) => {
  const findById = vi.fn(async () => persisted);
  const transition = vi.fn(async ({ patch }: { patch: Partial<ExecutionRecord> }) => ({ ...persisted, ...patch }));
  const dao = { findById, transition } as unknown as TaskExecutionDao;
  const cancelTask = vi.fn(async () => {});
  const reconcile = vi.fn(async () => ({ execution: reconciled, reachable: true }));
  const service = new ExecutionCancelService({ dao, gateway: { cancelTask }, sync: { reconcile } as never, clock: () => new Date() });
  return { service, cancelTask, reconcile, transition };
};

describe("execution cancellation", () => {
  it("UT-021 replays cancellation without calling Compozy", async () => {
    const { service, cancelTask } = setup({ ...record, state: "canceled" });
    expect(await service.cancel({ taskId: "task", executionId: "execution" })).toEqual({ state: "canceled", replayed: true });
    expect(cancelTask).not.toHaveBeenCalled();
  });

  it("UT-022 returns a terminal state found during reconciliation", async () => {
    const { service, cancelTask, reconcile } = setup(record, { ...record, state: "completed" });
    expect(await service.cancel({ taskId: "task", executionId: "execution" })).toEqual({ state: "completed", replayed: false });
    expect(reconcile).toHaveBeenCalledOnce();
    expect(cancelTask).not.toHaveBeenCalled();
  });
});
