import { desc, inArray } from "drizzle-orm";
import { taskPlanningDecisions } from "../../schema";
import type { Database } from "../../client";
import type { WorkProgress } from "../../../../application/services/assigned-issues/assignedIssueContracts";

async function readRoutes(database: Database, taskIds: string[]) {
  const rows = await database.selectDistinctOn([taskPlanningDecisions.taskId], { taskId: taskPlanningDecisions.taskId, route: taskPlanningDecisions.selectedRoute }).from(taskPlanningDecisions).where(inArray(taskPlanningDecisions.taskId, taskIds)).orderBy(taskPlanningDecisions.taskId, desc(taskPlanningDecisions.createdAt));
  return new Map(rows.map((row) => [row.taskId, row.route]));
}

export async function readProgress(database: Database, taskIds: string[]): Promise<Map<string, WorkProgress>> {
  if (taskIds.length === 0) return new Map();
  const routes = await readRoutes(database, taskIds);
  return new Map(taskIds.map((taskId) => [taskId, { route: routes.get(taskId) ?? null }]));
}
