import { and, asc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { FINAL_SESSION_STATUSES } from "../../../../application/terminal/terminalSessionStatus";
import type { ClaimInput, ControlKind, SessionControlDao } from "../../../../application/terminal/sessionInteractionPorts";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";
import { toSessionRecord } from "./terminalSessionWrites";

const FLOW_DEV_RUNTIME = "flow_dev";
const CLAIMABLE_STATUSES = ["opening", "unconfirmed"];
const INTERRUPTED_STATUS = "interrupted";
const NOT_FINAL = [...FINAL_SESSION_STATUSES];
const sessions = taskTerminalSessions;

export class DrizzleSessionControlDao implements SessionControlDao {
  constructor(private readonly database: Database) {}

  async claimOpening(input: ClaimInput) {
    const candidate = and(eq(sessions.runtime, FLOW_DEV_RUNTIME), eq(sessions.hostId, input.hostId), inArray(sessions.status, CLAIMABLE_STATUSES), isNull(sessions.workerId));
    const next = this.database.select({ id: sessions.id }).from(sessions).where(candidate).orderBy(asc(sessions.openedAt)).limit(1).for("update", { skipLocked: true });
    const [row] = await this.database.update(sessions).set({ workerId: input.workerId }).where(sql`${sessions.id} = (${next})`).returning();
    return row ? toSessionRecord(row) : null;
  }

  async requestInterrupt(sessionId: string, at: Date) {
    return this.markRequested(sessionId, { interruptRequestedAt: at });
  }

  async requestEnd(sessionId: string, at: Date) {
    return this.markRequested(sessionId, { endRequestedAt: at });
  }

  async clearControl(sessionId: string, kind: ControlKind) {
    const changes = kind === "interrupt" ? { interruptRequestedAt: null } : { endRequestedAt: null };
    await this.database.update(sessions).set(changes).where(eq(sessions.id, sessionId));
  }

  async markOrphans(input: ClaimInput) {
    const filter = and(eq(sessions.runtime, FLOW_DEV_RUNTIME), eq(sessions.hostId, input.hostId), ne(sessions.workerId, input.workerId), notInArray(sessions.status, [...NOT_FINAL, INTERRUPTED_STATUS]));
    const rows = await this.database.update(sessions).set({ status: INTERRUPTED_STATUS }).where(filter).returning({ id: sessions.id });
    return rows.map((row) => row.id);
  }

  private async markRequested(sessionId: string, changes: { interruptRequestedAt: Date } | { endRequestedAt: Date }) {
    const filter = and(eq(sessions.id, sessionId), notInArray(sessions.status, NOT_FINAL));
    const rows = await this.database.update(sessions).set(changes).where(filter).returning({ id: sessions.id });
    return rows.length > 0;
  }
}
