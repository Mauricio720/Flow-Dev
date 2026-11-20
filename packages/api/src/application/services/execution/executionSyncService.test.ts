import { describe, expect, it, vi } from "vitest";
import { TaskError } from "../tasks/taskErrors";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import type { CompozyGateway } from "../../compozy/compozyGateway";
import { ExecutionSyncService } from "./executionSyncService";
import { pullRequestFromResult } from "./pullRequestResult";

const record: ExecutionRecord = { id: "execution", taskId: "task", planningDecisionId: "decision", route: "direct_execution", state: "in_progress", attempt: 1, idempotencyKey: "key", compozyWorkspaceId: "workspace", workTaskId: "remote-task", branch: "branch", specRound: 0, pullRequestUrl: null, detail: {}, failureCode: null, lastSyncedAt: null, startedBy: "actor", createdAt: new Date(), finishedAt: null };
const setup = (reason: string) => {
  const transition = vi.fn(async ({ patch }: { patch: Partial<ExecutionRecord> }) => ({ ...record, ...patch }));
  const dao = { transition, findById: vi.fn() } as unknown as TaskExecutionDao;
  const gateway = { readTask: vi.fn(async () => { throw new TaskError(reason as never); }) } as unknown as CompozyGateway;
  return { service: new ExecutionSyncService({ dao, gateway, clock: () => new Date() }), transition };
};

describe("execution reconciliation", () => {
  it("UT-019 projects a deleted Compozy task as failed", async () => {
    const { service, transition } = setup("compozy_task_missing");
    const result = await service.reconcile(record);
    expect(result.execution).toMatchObject({ state: "failed", failureCode: "compozy_task_missing" });
    expect(transition).toHaveBeenCalledOnce();
  });

  it("UT-020 keeps the persisted state when Compozy is unavailable", async () => {
    const { service, transition } = setup("compozy_unavailable");
    const result = await service.reconcile(record);
    expect(result).toEqual({ execution: record, reachable: false });
    expect(transition).not.toHaveBeenCalled();
  });

  it("UT-031 reads a pull request from the result's final line", () => {
    expect(pullRequestFromResult("Implementado\nPR: https://github.com/acme/meu-app/pull/87")).toBe("https://github.com/acme/meu-app/pull/87");
  });
});
