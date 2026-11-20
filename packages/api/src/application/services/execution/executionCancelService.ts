import type { CompozyGateway } from "../../compozy/compozyGateway";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";
import { activeExecutionStates, isTerminalExecution } from "./executionContracts";
import { logExecutionEvent } from "./executionLog";
import type { ExecutionSyncService } from "./executionSyncService";
import { cancelExecutionTasks } from "./executionTaskCancellation";

type CancelDeps = { dao: TaskExecutionDao; gateway: Pick<CompozyGateway, "cancelTask" | "readTask">; sync: Pick<ExecutionSyncService, "reconcile">; clock: () => Date };
type CancelScope = { taskId: string; executionId: string };
const CANCELED = "canceled";
const REJECTED = "compozy_rejected";

export class ExecutionCancelService {
  constructor(private readonly deps: CancelDeps) {}

  async cancel(scope: CancelScope) {
    const execution = await this.deps.dao.findById(scope.taskId, scope.executionId);
    if (!execution) throw new TaskError("execution_not_found");
    if (isTerminalExecution(execution.state)) return { state: execution.state, replayed: execution.state === CANCELED };
    if (!execution.workTaskId && !execution.specTaskId) return this.markCanceled(execution);
    const current = await this.reconciled(execution);
    if (isTerminalExecution(current.state)) return { state: current.state, replayed: false };
    const settled = await this.cancelRemote(current);
    if (settled) return { state: settled.state, replayed: false };
    return this.markCanceled(current);
  }

  private async cancelRemote(execution: ExecutionRecord): Promise<ExecutionRecord | null> {
    try {
      await cancelExecutionTasks(this.deps.gateway, execution);
      return null;
    } catch (error) {
      if (!(error instanceof TaskError) || error.reason !== REJECTED) throw error;
      const current = await this.reconciled(execution);
      if (isTerminalExecution(current.state)) return current;
      throw error;
    }
  }

  private async reconciled(execution: ExecutionRecord) {
    const outcome = await this.deps.sync.reconcile(execution);
    if (!outcome.reachable) throw new TaskError("compozy_unavailable");
    return outcome.execution;
  }

  private async markCanceled(execution: ExecutionRecord) {
    const now = this.deps.clock();
    const canceled = await this.deps.dao.transition({ id: execution.id, from: activeExecutionStates, patch: { state: CANCELED, finishedAt: now, lastSyncedAt: now } });
    if (canceled) logExecutionEvent("execution.state_changed", { executionId: execution.id, from: execution.state, to: CANCELED });
    const settled = canceled ?? (await this.deps.dao.findById(execution.taskId, execution.id)) ?? execution;
    return { state: settled.state, replayed: false };
  }
}
