import { desc, inArray } from "drizzle-orm";
import { taskCompozyExecutions, taskPlanningDecisions } from "../../schema";
import type { Database } from "../../client";
import type { WorkExecutionProgress, WorkProgress } from "../../../../application/services/assigned-issues/assignedIssueContracts";

async function readRoutes(database: Database, taskIds: string[]) {
  const rows = await database.selectDistinctOn([taskPlanningDecisions.taskId], { taskId: taskPlanningDecisions.taskId, route: taskPlanningDecisions.selectedRoute }).from(taskPlanningDecisions).where(inArray(taskPlanningDecisions.taskId, taskIds)).orderBy(taskPlanningDecisions.taskId, desc(taskPlanningDecisions.createdAt));
  return new Map(rows.map((row) => [row.taskId, row.route]));
}

async function readExecutions(database: Database, taskIds: string[]) {
  const columns = { taskId: taskCompozyExecutions.taskId, executionId: taskCompozyExecutions.id, state: taskCompozyExecutions.state, pullRequestUrl: taskCompozyExecutions.pullRequestUrl };
  const rows = await database.selectDistinctOn([taskCompozyExecutions.taskId], columns).from(taskCompozyExecutions).where(inArray(taskCompozyExecutions.taskId, taskIds)).orderBy(taskCompozyExecutions.taskId, desc(taskCompozyExecutions.createdAt));
  return new Map<string, WorkExecutionProgress>(rows.map(({ taskId, ...execution }) => [taskId, execution]));
}

export async function readProgress(database: Database, taskIds: string[]): Promise<Map<string, WorkProgress>> {
  if (taskIds.length === 0) return new Map();
  const [routes, executions] = await Promise.all([readRoutes(database, taskIds), readExecutions(database, taskIds)]);
  return new Map(taskIds.map((taskId) => [taskId, { route: routes.get(taskId) ?? null, execution: executions.get(taskId) ?? null }]));
}
