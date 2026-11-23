import { and, eq, inArray } from "drizzle-orm";
import type { RequestKind, RequestPayload, RequestStatus } from "../../../../application/terminal/sessionInteraction";
import type { AnswerRequestInput, InsertRequestInput, SessionRequestDao, SessionRequestRecord } from "../../../../application/terminal/sessionInteractionPorts";
import type { Database } from "../../client";
import { taskTerminalRequests } from "../../schema";

const PENDING = "pending";
const ANSWERED = "answered";
const CANCELLED = "cancelled";

function toRecord(row: typeof taskTerminalRequests.$inferSelect): SessionRequestRecord {
  return { ...row, kind: row.kind as RequestKind, status: row.status as RequestStatus, payload: row.payload as RequestPayload };
}

export class DrizzleSessionRequestDao implements SessionRequestDao {
  constructor(private readonly database: Database) {}

  async insertRequest(input: InsertRequestInput) {
    const [row] = await this.database.insert(taskTerminalRequests).values(input).returning();
    return toRecord(row!);
  }

  async findById(requestId: string) {
    const [row] = await this.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.id, requestId)).limit(1);
    return row ? toRecord(row) : null;
  }

  async answerIfPending(input: AnswerRequestInput) {
    const changes = { status: ANSWERED, answer: input.answer, answeredBy: input.answeredBy, answeredAt: input.at };
    const filter = and(eq(taskTerminalRequests.id, input.requestId), eq(taskTerminalRequests.status, PENDING));
    const [row] = await this.database.update(taskTerminalRequests).set(changes).where(filter).returning();
    return row ? toRecord(row) : null;
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
