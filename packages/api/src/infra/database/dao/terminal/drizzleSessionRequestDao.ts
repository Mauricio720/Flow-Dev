import { and, eq, inArray, isNull } from "drizzle-orm";
import { isActiveSession, type TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { RequestKind, RequestPayload, RequestStatus } from "../../../../application/terminal/sessionInteraction";
import type { AnswerRequestInput, InsertRequestInput, SessionRequestDao, SessionRequestRecord } from "../../../../application/terminal/sessionInteractionPorts";
import type { Database } from "../../client";
import { taskTerminalRequests, taskTerminalSessions } from "../../schema";

const PENDING = "pending";
const ANSWERED = "answered";
const CANCELLED = "cancelled";

function toRecord(row: typeof taskTerminalRequests.$inferSelect): SessionRequestRecord {
  return { ...row, kind: row.kind as RequestKind, status: row.status as RequestStatus, payload: row.payload as RequestPayload };
}

export class DrizzleSessionRequestDao implements SessionRequestDao {
  constructor(private readonly database: Database) {}

  async insertRequest(input: InsertRequestInput) {
    return this.database.transaction(async (tx) => {
      const [session] = await tx.select({ status: taskTerminalSessions.status, interruptRequestedAt: taskTerminalSessions.interruptRequestedAt, endRequestedAt: taskTerminalSessions.endRequestedAt }).from(taskTerminalSessions).where(eq(taskTerminalSessions.id, input.sessionId)).for("update");
      if (!session || !isActiveSession(session.status as TerminalSessionStatus) || session.interruptRequestedAt || session.endRequestedAt) throw new Error("session_request_closed");
      const [row] = await tx.insert(taskTerminalRequests).values(input).returning();
      return toRecord(row!);
    });
  }

  async findById(requestId: string) {
    const [row] = await this.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.id, requestId)).limit(1);
    return row ? toRecord(row) : null;
  }

  async answerIfPending(input: AnswerRequestInput) {
    const changes = { status: ANSWERED, answer: input.answer, answeredBy: input.answeredBy, answeredAt: input.at };
    return this.database.transaction(async (tx) => {
      const [request] = await tx.select({ sessionId: taskTerminalRequests.sessionId }).from(taskTerminalRequests).where(eq(taskTerminalRequests.id, input.requestId)).limit(1);
      if (!request) return null;
      const [session] = await tx.select({ status: taskTerminalSessions.status, interruptRequestedAt: taskTerminalSessions.interruptRequestedAt, endRequestedAt: taskTerminalSessions.endRequestedAt }).from(taskTerminalSessions).where(eq(taskTerminalSessions.id, request.sessionId)).for("update");
      if (!session || !isActiveSession(session.status as TerminalSessionStatus) || session.interruptRequestedAt || session.endRequestedAt) return null;
      const filter = and(eq(taskTerminalRequests.id, input.requestId), eq(taskTerminalRequests.status, PENDING));
      const [row] = await tx.update(taskTerminalRequests).set(changes).where(filter).returning();
      return row ? toRecord(row) : null;
    });
  }

  async cancelPending(sessionId: string, at: Date) {
    const filter = and(eq(taskTerminalRequests.sessionId, sessionId), eq(taskTerminalRequests.status, PENDING));
    const rows = await this.database.update(taskTerminalRequests).set({ status: CANCELLED, answeredAt: at }).where(filter).returning({ id: taskTerminalRequests.id });
    return rows.map((row) => row.id);
  }

  async listAnsweredFor(requestIds: string[]) {
    if (requestIds.length === 0) return [];
    const filter = and(inArray(taskTerminalRequests.id, requestIds), eq(taskTerminalRequests.status, ANSWERED));
    return (await this.database.select().from(taskTerminalRequests).where(filter)).map(toRecord);
  }

  async pendingIds(sessionId: string) {
    const filter = and(eq(taskTerminalRequests.sessionId, sessionId), eq(taskTerminalRequests.status, PENDING));
    const rows = await this.database.select({ id: taskTerminalRequests.id }).from(taskTerminalRequests).where(filter);
    return rows.map((row) => row.id);
  }
}
