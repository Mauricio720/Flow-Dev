import type { taskCompozyExecutions } from "../../schema";
import type { ExecutionRecord } from "../../../../application/database/dao/taskExecutionDao";
import type { ExecutionState } from "../../../../application/services/execution/executionContracts";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";

export type ExecutionRow = typeof taskCompozyExecutions.$inferSelect;

export function toExecution(row: ExecutionRow): ExecutionRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    planningDecisionId: row.planningDecisionId,
    route: row.route as PlanningRoute,
    state: row.state as ExecutionState,
    attempt: row.attempt,
    idempotencyKey: row.idempotencyKey,
    compozyWorkspaceId: row.compozyWorkspaceId,
    workTaskId: row.workTaskId,
    branch: row.branch,
    specRound: row.specRound,
    pullRequestUrl: row.pullRequestUrl,
    detail: row.detail,
    failureCode: row.failureCode,
    lastSyncedAt: row.lastSyncedAt,
    startedBy: row.startedBy,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
  };
}
