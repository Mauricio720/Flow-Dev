import { and, desc, eq, inArray } from "drizzle-orm";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import { effectiveRoute } from "../../../../application/services/tasks/routeSwitchRules";
import { CONFIRMED_ROUTE_SWITCH_STATUS } from "../../../../application/terminal/routeSwitch";
import { taskPlanningDecisions, taskRouteSwitches } from "../../schema";
import type { Database } from "../../client";
import type { WorkProgress } from "../../../../application/services/assigned-issues/assignedIssueContracts";

async function readRoutes(database: Database, taskIds: string[]) {
  const rows = await database.selectDistinctOn([taskPlanningDecisions.taskId], { taskId: taskPlanningDecisions.taskId, decisionId: taskPlanningDecisions.id, route: taskPlanningDecisions.selectedRoute, switchId: taskRouteSwitches.id }).from(taskPlanningDecisions).leftJoin(taskRouteSwitches, and(eq(taskRouteSwitches.planningDecisionId, taskPlanningDecisions.id), eq(taskRouteSwitches.status, CONFIRMED_ROUTE_SWITCH_STATUS))).where(inArray(taskPlanningDecisions.taskId, taskIds)).orderBy(taskPlanningDecisions.taskId, desc(taskPlanningDecisions.createdAt));
  return new Map(rows.map((row) => [row.taskId, effectiveRoute({ approvedRoute: row.route as PlanningRoute, currentDecisionId: row.decisionId, confirmedSwitch: row.switchId ? { planningDecisionId: row.decisionId } : null })]));
}

export async function readProgress(database: Database, taskIds: string[]): Promise<Map<string, WorkProgress>> {
  if (taskIds.length === 0) return new Map();
  const routes = await readRoutes(database, taskIds);
  return new Map(taskIds.map((taskId) => [taskId, { route: routes.get(taskId) ?? null }]));
}
