import { and, desc, eq, lt } from "drizzle-orm";
import type { ExecutionSessionRow, TerminalExecutionDao } from "../../../../application/database/dao/terminalExecutionDao";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskTerminalSessions, users } from "../../schema";
import { queryArtifactSummaries, queryAttachments, queryEventCounts, queryRecentEvents } from "./terminalExecutionQueries";

const OPENING_STATUS = "opening";
const UNCONFIRMED_STATUS = "unconfirmed";

export class DrizzleTerminalExecutionDao implements TerminalExecutionDao {
  constructor(private readonly database: Database) {}

  async sessionsOf(taskId: string): Promise<ExecutionSessionRow[]> {
    const rows = await this.database.select({ id: taskTerminalSessions.id, status: taskTerminalSessions.status, route: taskTerminalSessions.route, name: users.name, displayName: users.displayName, openedAt: taskTerminalSessions.openedAt, lastSignalAt: taskTerminalSessions.lastSignalAt, endedAt: taskTerminalSessions.endedAt, droppedEvents: taskTerminalSessions.droppedEvents, filesRemovedAt: taskTerminalSessions.filesRemovedAt }).from(taskTerminalSessions).innerJoin(users, eq(users.id, taskTerminalSessions.userId)).where(eq(taskTerminalSessions.taskId, taskId)).orderBy(desc(taskTerminalSessions.openedAt));
    return rows.map(({ name, displayName, ...row }) => ({ ...row, status: row.status as TerminalSessionStatus, route: row.route as PlanningRoute, userName: displayName ?? name }));
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
