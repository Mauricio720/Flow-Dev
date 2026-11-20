import type { CompozyGateway } from "../../compozy/compozyGateway";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";
import type { ExecutionPlan } from "./executionPlan";
import { logExecutionEvent } from "./executionLog";

const UNAVAILABLE_REASON = "compozy_unavailable";
const DISPATCH_FAILURE = "service_unavailable";

type DispatchDeps = { dao: TaskExecutionDao; gateway: CompozyGateway; clock: () => Date };

export class ExecutionDispatcher {
  constructor(private readonly deps: DispatchDeps) {}

  async dispatch(execution: ExecutionRecord, plan: ExecutionPlan): Promise<ExecutionRecord> {
    try {
      const { taskId } = await this.deps.gateway.createTask(execution.compozyWorkspaceId, plan.work);
      await this.deps.gateway.enqueueRun({ taskId, idempotencyKey: execution.idempotencyKey });
      return await this.settle(execution, { state: "in_progress", workTaskId: taskId, detail: { workIdentifier: plan.work.identifier }, lastSyncedAt: this.deps.clock() });
    } catch (error) {
      return this.settleFailure(execution, plan, error);
    }
  }

  private settleFailure(execution: ExecutionRecord, plan: ExecutionPlan, error: unknown) {
    const reason = error instanceof TaskError ? error.reason : DISPATCH_FAILURE;
    logExecutionEvent("execution.dispatch_failed", { executionId: execution.id, code: reason });
    const detail = { workIdentifier: plan.work.identifier };
    if (reason === UNAVAILABLE_REASON) return this.settle(execution, { state: "unavailable", failureCode: reason, detail });
    return this.settle(execution, { state: "failed", failureCode: reason, detail, finishedAt: this.deps.clock() });
  }

  private async settle(execution: ExecutionRecord, patch: Parameters<TaskExecutionDao["transition"]>[0]["patch"]) {
    const settled = await this.deps.dao.transition({ id: execution.id, from: ["dispatching"], patch });
    if (settled) logExecutionEvent("execution.state_changed", { executionId: execution.id, from: execution.state, to: settled.state });
    return settled ?? execution;
  }
}
