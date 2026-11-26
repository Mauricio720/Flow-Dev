import { and, desc, eq, lt } from "drizzle-orm";
import type { ExecutionSessionRow, TerminalExecutionDao } from "../../../../application/database/dao/terminalExecutionDao";
import type { SessionAgent } from "../../../../application/terminal/sessionAgentCatalog";
import type { SessionPurposeKind } from "../../../../application/terminal/sessionPurposeKind";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import { CONFIRMED_ROUTE_SWITCH_STATUS } from "../../../../application/terminal/routeSwitch";
import type { SessionRuntimeKind } from "../../../../application/terminal/sessionInteraction";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskRouteSwitches, taskTerminalSessions, users } from "../../schema";
import { queryArtifactSummaries, queryAttachments, queryEventCounts, queryRecentEvents } from "./terminalExecutionQueries";

const OPENING_STATUS = "opening";
const UNCONFIRMED_STATUS = "unconfirmed";

export class DrizzleTerminalExecutionDao implements TerminalExecutionDao {
  constructor(private readonly database: Database) {}

  async sessionsOf(taskId: string): Promise<ExecutionSessionRow[]> {
    const rows = await this.database.select({ id: taskTerminalSessions.id, status: taskTerminalSessions.status, runtime: taskTerminalSessions.runtime, route: taskTerminalSessions.route, name: users.name, displayName: users.displayName, openedAt: taskTerminalSessions.openedAt, lastSignalAt: taskTerminalSessions.lastSignalAt, endedAt: taskTerminalSessions.endedAt, droppedEvents: taskTerminalSessions.droppedEvents, filesRemovedAt: taskTerminalSessions.filesRemovedAt, purpose: taskTerminalSessions.purpose, planItemId: taskTerminalSessions.planItemId, agent: taskTerminalSessions.agent, model: taskTerminalSessions.model, effort: taskTerminalSessions.effort }).from(taskTerminalSessions).innerJoin(users, eq(users.id, taskTerminalSessions.userId)).where(eq(taskTerminalSessions.taskId, taskId)).orderBy(desc(taskTerminalSessions.openedAt));
    const switches = rows.length ? await this.database.select({ sessionId: taskRouteSwitches.sessionId }).from(taskRouteSwitches).where(and(eq(taskRouteSwitches.taskId, taskId), eq(taskRouteSwitches.status, CONFIRMED_ROUTE_SWITCH_STATUS))) : [];
    const switched = new Set(switches.map((row) => row.sessionId));
    return rows.map(({ name, displayName, ...row }) => ({ ...row, switchedTo: switched.has(row.id) ? "direct_execution" as const : null, status: row.status as TerminalSessionStatus, runtime: row.runtime as SessionRuntimeKind, route: row.route as PlanningRoute, purpose: row.purpose as SessionPurposeKind, agent: row.agent as SessionAgent, userName: displayName ?? name }));
  }

  recentEvents(sessionIds: string[], limit: number) {
    return queryRecentEvents(this.database, sessionIds, limit);
  }

  eventCounts(sessionIds: string[]) {
    return queryEventCounts(this.database, sessionIds);
  }

  attachmentsOf(sessionIds: string[]) {
    return queryAttachments(this.database, sessionIds);
  }

  artifactSummaries(taskId: string) {
    return queryArtifactSummaries(this.database, taskId);
  }

  async expireUnconfirmed(scope: { projectId: string; taskId: string }, before: Date) {
    const filter = and(eq(taskTerminalSessions.projectId, scope.projectId), eq(taskTerminalSessions.taskId, scope.taskId), eq(taskTerminalSessions.status, OPENING_STATUS), lt(taskTerminalSessions.openedAt, before));
    await this.database.update(taskTerminalSessions).set({ status: UNCONFIRMED_STATUS }).where(filter);
  }
}
