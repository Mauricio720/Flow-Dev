import { and, asc, eq, exists, inArray, notInArray, or } from "drizzle-orm";
import type { PlanRunState } from "../../../../application/database/dao/planRunDao";
import type { PlanRunWorkerDao } from "../../../../application/database/dao/planRunWorkerDao";
import { AGENT_WORKING_STATUSES } from "../../../../application/services/plan-run/planRunWorking";
import { FINAL_SESSION_STATUSES } from "../../../../application/terminal/terminalSessionStatus";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskSessionPlanRuns, taskSessionPlans, taskTerminalRequests, taskTerminalSessions, tasks } from "../../schema";

const RUNNING: PlanRunState = "running";
const PENDING_REQUEST = "pending";

export class DrizzlePlanRunWorkerDao implements PlanRunWorkerDao {
  constructor(private readonly database: Database) {}

  async listRunningForHost(hostId: string) {
    const rows = await this.database.select({ run: taskSessionPlanRuns, taskId: tasks.id, projectId: tasks.projectId }).from(taskSessionPlanRuns).innerJoin(taskSessionPlans, eq(taskSessionPlans.id, taskSessionPlanRuns.planId)).innerJoin(tasks, eq(tasks.id, taskSessionPlans.taskId)).where(and(eq(taskSessionPlanRuns.hostId, hostId), eq(taskSessionPlanRuns.state, RUNNING))).orderBy(asc(taskSessionPlanRuns.createdAt));
    return rows.map((row) => ({ ...row.run, state: row.run.state as PlanRunState, taskId: row.taskId, projectId: row.projectId, pausedByName: null }));
  }

  async agentWorking(taskId: string) {
    const pending = this.database.select({ id: taskTerminalRequests.id }).from(taskTerminalRequests).where(and(eq(taskTerminalRequests.sessionId, taskTerminalSessions.id), eq(taskTerminalRequests.status, PENDING_REQUEST)));
    const working = or(inArray(taskTerminalSessions.status, [...AGENT_WORKING_STATUSES]), and(notInArray(taskTerminalSessions.status, [...FINAL_SESSION_STATUSES]), exists(pending)));
    const [row] = await this.database.select({ id: taskTerminalSessions.id }).from(taskTerminalSessions).where(and(eq(taskTerminalSessions.taskId, taskId), working)).limit(1);
    return row !== undefined;
  }

  async currentSession(sessionId: string) {
    const [row] = await this.database.select({ status: taskTerminalSessions.status, launchError: taskTerminalSessions.launchError }).from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId)).limit(1);
    return row ? { status: row.status as TerminalSessionStatus, launchError: row.launchError } : null;
  }
}
