import { and, eq, inArray, isNotNull, isNull, notInArray, or } from "drizzle-orm";
import { applySessionSignal, type SessionSignal } from "../../../../application/services/terminal/sessionSignals";
import { FINAL_SESSION_STATUSES, type TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { ControlRequestQuery, EndInput, ResumeClaim, SessionControlRow, SessionStatusDao, StatusTransition } from "../../../../application/terminal/sessionStatusPorts";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";
import { toSessionRecord } from "./terminalSessionWrites";

const sessions = taskTerminalSessions;
const FLOW_DEV_RUNTIME = "flow_dev";
const INTERRUPTED = "interrupted";
const RUNNING = "running";
const ENDED = "ended";
const UNSTARTED = ["opening", "unconfirmed"];

export class DrizzleSessionStatusDao implements SessionStatusDao {
  constructor(private readonly database: Database) {}

  transition(sessionId: string, signal: SessionSignal): Promise<StatusTransition | null> {
    return this.database.transaction(async (tx) => {
      const [row] = await tx.select({ status: sessions.status }).from(sessions).where(eq(sessions.id, sessionId)).for("update");
      if (!row) return null;
      const from = row.status as TerminalSessionStatus;
      const to = applySessionSignal(from, signal);
      if (!to || to === from) return null;
      await tx.update(sessions).set({ status: to }).where(eq(sessions.id, sessionId));
      return { from, to };
    });
  }

  async controlRequests(query: ControlRequestQuery): Promise<SessionControlRow[]> {
    const filters = [];
    if (query.sessionIds.length > 0) filters.push(inArray(sessions.id, query.sessionIds));
    filters.push(and(eq(sessions.runtime, FLOW_DEV_RUNTIME), eq(sessions.hostId, query.hostId), eq(sessions.status, INTERRUPTED), isNotNull(sessions.endRequestedAt)));
    filters.push(and(eq(sessions.runtime, FLOW_DEV_RUNTIME), eq(sessions.hostId, query.hostId), inArray(sessions.status, UNSTARTED), isNull(sessions.workerId), isNotNull(sessions.endRequestedAt)));
    const rows = await this.database.select({ id: sessions.id, status: sessions.status, interruptRequestedAt: sessions.interruptRequestedAt, endRequestedAt: sessions.endRequestedAt }).from(sessions).where(or(...filters));
    return rows.map((row) => ({ ...row, status: row.status as TerminalSessionStatus }));
  }

  async markEnded(input: EndInput) {
    const filter = and(eq(sessions.id, input.sessionId), notInArray(sessions.status, [...FINAL_SESSION_STATUSES]));
    const rows = await this.database.update(sessions).set({ status: ENDED, endedAt: input.at, endReason: input.reason, endRequestedAt: null, interruptRequestedAt: null }).where(filter).returning({ id: sessions.id });
    return rows.length > 0;
  }

  async listInterrupted(hostId: string) {
    const rows = await this.database.select().from(sessions).where(and(eq(sessions.runtime, FLOW_DEV_RUNTIME), eq(sessions.hostId, hostId), eq(sessions.status, INTERRUPTED))).orderBy(sessions.openedAt);
    return rows.map(toSessionRecord);
  }

  async claimResume(input: ResumeClaim) {
    const filter = and(eq(sessions.id, input.sessionId), eq(sessions.status, INTERRUPTED), isNull(sessions.endRequestedAt));
    const [row] = await this.database.update(sessions).set({ status: RUNNING, workerId: input.workerId, interruptRequestedAt: null }).where(filter).returning();
    return row ? toSessionRecord(row) : null;
  }
}
