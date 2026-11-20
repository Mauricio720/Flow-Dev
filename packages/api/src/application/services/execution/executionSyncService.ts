import type { CompozyGateway, CompozyTaskState } from "../../compozy/compozyGateway";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";
import { activeExecutionStates, isTerminalExecution } from "./executionContracts";
import { logExecutionEvent } from "./executionLog";
import { EXECUTION_MAX_ATTEMPTS, WORKER_AGENT } from "./executionPlan";
import { projectExecution, type Projection } from "./executionProjection";
import { ExecutionPullRequests } from "./executionPullRequests";

export type SyncOutcome = { execution: ExecutionRecord; reachable: boolean };
type SyncDeps = { dao: TaskExecutionDao; gateway: CompozyGateway; clock: () => Date };
const MISSING_TASK = "compozy_task_missing";
const UNAVAILABLE = "compozy_unavailable";
const REJECTED = "compozy_rejected";

export class ExecutionSyncService {
  private readonly pullRequests: ExecutionPullRequests;

  constructor(private readonly deps: SyncDeps) {
    this.pullRequests = new ExecutionPullRequests(deps.gateway);
  }

  async reconcile(execution: ExecutionRecord): Promise<SyncOutcome> {
    if (!execution.workTaskId || isTerminalExecution(execution.state)) return { execution, reachable: true };
    try {
      const task = await this.deps.gateway.readTask(execution.workTaskId);
      return { execution: await this.apply(execution, task), reachable: true };
    } catch (error) {
      if (error instanceof TaskError && error.reason === MISSING_TASK) return { execution: await this.save(execution, missingTask()), reachable: true };
      if (error instanceof TaskError && error.reason === UNAVAILABLE) return { execution, reachable: false };
      throw error;
    }
  }

  private async apply(execution: ExecutionRecord, task: CompozyTaskState) {
    const pullRequestUrl = await this.pullRequests.resolve(execution, task);
    const projection = projectExecution({ task, maxAttempts: EXECUTION_MAX_ATTEMPTS, agent: WORKER_AGENT, pullRequestUrl });
    await this.runAction(execution, task, projection);
    return this.save(execution, projection);
  }

  private async runAction(execution: ExecutionRecord, task: CompozyTaskState, projection: Projection) {
    const run = task.latestRun;
    if (!run || !projection.action) return;
    const action = projection.action === "request_review"
      ? () => this.deps.gateway.requestReview({ taskId: task.taskId, runId: run.runId })
      : () => this.deps.gateway.enqueueRun({ taskId: task.taskId, idempotencyKey: continuationKey(execution, run.attempt) });
    await action().catch(ignoreRejection);
  }

  private async save(execution: ExecutionRecord, projection: Pick<Projection, "state" | "detail" | "failureCode" | "failureDetail" | "pullRequestUrl">) {
    const now = this.deps.clock();
    const detail = { ...execution.detail, ...projection.detail, failureDetail: projection.failureDetail };
    const patch = { state: projection.state, detail, failureCode: projection.failureCode, pullRequestUrl: projection.pullRequestUrl, lastSyncedAt: now, finishedAt: isTerminalExecution(projection.state) ? now : null };
    const saved = await this.deps.dao.transition({ id: execution.id, from: activeExecutionStates, patch });
    if (saved && saved.state !== execution.state) logExecutionEvent("execution.state_changed", { executionId: execution.id, from: execution.state, to: saved.state });
    return saved ?? (await this.deps.dao.findById(execution.taskId, execution.id)) ?? execution;
  }
}

function continuationKey(execution: ExecutionRecord, attempt: number) {
  return `${execution.idempotencyKey}:run:${attempt + 1}`;
}

function ignoreRejection(error: unknown) {
  if (error instanceof TaskError && error.reason === REJECTED) return;
  throw error;
}

function missingTask() {
  return { state: "failed" as const, detail: { agent: null, runAttempt: null, review: null, blocks: [], attention: null }, failureCode: MISSING_TASK, failureDetail: null, pullRequestUrl: null };
}
