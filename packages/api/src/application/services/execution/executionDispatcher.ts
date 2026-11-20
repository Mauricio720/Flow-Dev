import type { CompozyGateway } from "../../compozy/compozyGateway";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";
import { INITIAL_SPEC_ROUND, SPEC_ROUND_METADATA } from "./executionPlan";
import type { DirectExecutionPlan, ExecutionPlan, SpecExecutionPlan } from "./executionPlan";
import { resolveSpecWorktree } from "./executionWorktree";
import { logExecutionEvent } from "./executionLog";

const UNAVAILABLE_REASON = "compozy_unavailable";
const DISPATCH_FAILURE = "service_unavailable";

type DispatchDeps = { dao: TaskExecutionDao; gateway: CompozyGateway; clock: () => Date };

export class ExecutionDispatcher {
  constructor(private readonly deps: DispatchDeps) {}

  async dispatch(execution: ExecutionRecord, plan: ExecutionPlan): Promise<ExecutionRecord> {
    try {
      return plan.route === "direct_execution" ? await this.dispatchDirect(execution, plan) : await this.dispatchSpec(execution, plan);
    } catch (error) {
      return this.settleFailure(execution, plan, error);
    }
  }

  private async dispatchDirect(execution: ExecutionRecord, plan: DirectExecutionPlan) {
    const { taskId } = await this.deps.gateway.createTask(execution.compozyWorkspaceId, plan.work);
    await this.deps.gateway.enqueueRun({ taskId, idempotencyKey: execution.idempotencyKey });
    return this.settle(execution, { state: "in_progress", workTaskId: taskId, detail: { workIdentifier: plan.workIdentifier }, lastSyncedAt: this.deps.clock() });
  }

  private async dispatchSpec(execution: ExecutionRecord, plan: SpecExecutionPlan) {
    const worktree = await resolveSpecWorktree(this.deps.gateway, { workspaceId: execution.compozyWorkspaceId, ...plan.worktree });
    const specTaskId = (await this.deps.gateway.createTask(execution.compozyWorkspaceId, plan.createSpecTask(worktree.worktreeId))).taskId;
    const deliveryTask = await this.deps.gateway.createTask(execution.compozyWorkspaceId, plan.createDeliveryTask(worktree.path));
    await this.deps.gateway.addDependency({ taskId: deliveryTask.taskId, dependsOnTaskId: specTaskId });
    await this.deps.gateway.enqueueRun({ taskId: specTaskId, idempotencyKey: execution.idempotencyKey, metadata: { [SPEC_ROUND_METADATA]: String(INITIAL_SPEC_ROUND) } });
    return this.settle(execution, { state: "spec_in_progress", specTaskId, specWorktreeId: worktree.worktreeId, specDir: plan.specDir, specRound: INITIAL_SPEC_ROUND, workTaskId: deliveryTask.taskId, detail: { specIdentifier: plan.specIdentifier, workIdentifier: plan.deliveryIdentifier }, lastSyncedAt: this.deps.clock() });
  }

  private settleFailure(execution: ExecutionRecord, plan: ExecutionPlan, error: unknown) {
    const reason = error instanceof TaskError ? error.reason : DISPATCH_FAILURE;
    logExecutionEvent("execution.dispatch_failed", { executionId: execution.id, code: reason });
    const detail = planDetails(plan);
    if (reason === UNAVAILABLE_REASON) return this.settle(execution, { state: "unavailable", failureCode: reason, detail });
    return this.settle(execution, { state: "failed", failureCode: reason, detail, finishedAt: this.deps.clock() });
  }

  private async settle(execution: ExecutionRecord, patch: Parameters<TaskExecutionDao["transition"]>[0]["patch"]) {
    const settled = await this.deps.dao.transition({ id: execution.id, from: ["dispatching"], patch });
    if (settled) logExecutionEvent("execution.state_changed", { executionId: execution.id, from: execution.state, to: settled.state });
    return settled ?? execution;
  }
}

function planDetails(plan: ExecutionPlan) {
  return plan.route === "direct_execution"
    ? { workIdentifier: plan.workIdentifier }
    : { specIdentifier: plan.specIdentifier, workIdentifier: plan.deliveryIdentifier };
}
