import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { taskExecutionActions, taskExecutionRuns, taskPlanningDecisions, taskUnifiedPackageApprovals, taskUnifiedPackages } from "../../schema";
import type { Database } from "../../client";
import type { RunActivity } from "../../../../application/database/dao/taskFlowTypes";
import type { ProgressAction, ProgressActivity, ProgressPackage, ProgressRun, WorkProgress } from "../../../../application/services/assigned-issues/assignedIssueContracts";
import { ACTIVE_RUN_STATES } from "../../../../application/services/issue-deletion/deletionStop";

const PREVIEW_LIMIT = 280;
const NO_FLOW = "none";

type FlowKindRow = { task_id: string; flow_kind: WorkProgress["flow"] };

function groupByTask<T>(rows: { taskId: string; value: T }[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(row.taskId, [...(groups.get(row.taskId) ?? []), row.value]);
  return groups;
}

async function readRoutes(database: Database, taskIds: string[]) {
  const rows = await database.selectDistinctOn([taskPlanningDecisions.taskId], { taskId: taskPlanningDecisions.taskId, route: taskPlanningDecisions.selectedRoute }).from(taskPlanningDecisions).where(inArray(taskPlanningDecisions.taskId, taskIds)).orderBy(taskPlanningDecisions.taskId, desc(taskPlanningDecisions.createdAt));
  return new Map(rows.map((row) => [row.taskId, row.route]));
}

async function readFlowKinds(database: Database, taskIds: string[]) {
  const ids = sql.join(taskIds.map((taskId) => sql`${taskId}`), sql`, `);
  const rows = await database.execute<FlowKindRow>(sql`SELECT task_id, flow_kind FROM task_flow_kinds WHERE task_id IN (${ids})`);
  return new Map([...rows].map((row) => [row.task_id, row.flow_kind]));
}

async function readActions(database: Database, taskIds: string[]) {
  const rows = await database.select({ taskId: taskExecutionActions.taskId, kind: taskExecutionActions.kind, loopName: taskExecutionActions.loopName, state: taskExecutionActions.state, concludedAt: taskExecutionActions.concludedAt }).from(taskExecutionActions).where(and(inArray(taskExecutionActions.taskId, taskIds), isNull(taskExecutionActions.supersededAt))).orderBy(taskExecutionActions.taskId, taskExecutionActions.position);
  return groupByTask<ProgressAction>(rows.map(({ taskId, concludedAt, ...action }) => ({ taskId, value: { ...action, concludedAt: concludedAt?.toISOString() ?? null } })));
}

async function readPackages(database: Database, taskIds: string[]) {
  const rows = await database.select({ taskId: taskUnifiedPackages.taskId, format: taskUnifiedPackages.format, version: taskUnifiedPackages.version, status: taskUnifiedPackages.status, approvedAt: taskUnifiedPackageApprovals.approvedAt }).from(taskUnifiedPackages).leftJoin(taskUnifiedPackageApprovals, eq(taskUnifiedPackageApprovals.packageId, taskUnifiedPackages.id)).where(inArray(taskUnifiedPackages.taskId, taskIds));
  return groupByTask<ProgressPackage>(rows.map(({ taskId, approvedAt, ...item }) => ({ taskId, value: { ...item, approvedAt: approvedAt?.toISOString() ?? null } })));
}

function activitySummary(activity: RunActivity | null): ProgressActivity | null {
  if (!activity) return null;
  return { kind: activity.kind, at: activity.at, preview: activity.preview.slice(0, PREVIEW_LIMIT), tool: activity.tool, source: activity.source, status: activity.status };
}

async function readActiveRuns(database: Database, taskIds: string[]) {
  const rows = await database.select({ taskId: taskExecutionRuns.taskId, state: taskExecutionRuns.state, snapshot: taskExecutionRuns.snapshot, createdAt: taskExecutionRuns.createdAt, activity: taskExecutionRuns.activity }).from(taskExecutionRuns).where(and(inArray(taskExecutionRuns.taskId, taskIds), eq(taskExecutionRuns.isWrite, true), inArray(taskExecutionRuns.state, ACTIVE_RUN_STATES)));
  return new Map(rows.map((row): [string, ProgressRun] => [row.taskId, { kind: row.snapshot.kind as string, loopName: (row.snapshot.loopName as string | undefined) ?? null, state: row.state, createdAt: row.createdAt.toISOString(), activity: activitySummary(row.activity ?? null) }]));
}

export async function readProgress(database: Database, taskIds: string[]): Promise<Map<string, WorkProgress>> {
  if (taskIds.length === 0) return new Map();
  const [routes, flows, actions, packages, runs] = await Promise.all([readRoutes(database, taskIds), readFlowKinds(database, taskIds), readActions(database, taskIds), readPackages(database, taskIds), readActiveRuns(database, taskIds)]);
  return new Map(taskIds.map((taskId) => [taskId, { route: routes.get(taskId) ?? null, flow: flows.get(taskId) ?? NO_FLOW, actions: actions.get(taskId) ?? [], packages: packages.get(taskId) ?? [], activeRun: runs.get(taskId) ?? null }]));
}
