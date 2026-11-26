import { eq, sql } from "drizzle-orm";
import type { AuthenticatedSession, LockedSession, TerminalEventDao, TerminalEventWriter } from "../../../../application/database/dao/terminalEventDao";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";
import { lockSessionWithFolder } from "./lockedSessionFolder";
import { DrizzleTerminalEventWriter } from "./terminalEventWrites";

export class DrizzleTerminalEventDao implements TerminalEventDao {
  constructor(private readonly database: Database) {}

  async findByTokenHash(hash: string): Promise<AuthenticatedSession | null> {
    const [row] = await this.database.select({ id: taskTerminalSessions.id, status: taskTerminalSessions.status, checkoutPath: taskTerminalSessions.checkoutPath }).from(taskTerminalSessions).where(eq(taskTerminalSessions.tokenHash, hash)).limit(1);
    return row ? { ...row, status: row.status as TerminalSessionStatus } : null;
  }

  async incrementDropped(sessionId: string) {
    await this.database.update(taskTerminalSessions).set({ droppedEvents: sql`${taskTerminalSessions.droppedEvents} + 1` }).where(eq(taskTerminalSessions.id, sessionId));
  }

  withLockedSession<T>(sessionId: string, work: (session: LockedSession, writer: TerminalEventWriter) => Promise<T>): Promise<T | null> {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      const found = await lockSessionWithFolder(database, sessionId);
      if (!found) return null;
      const { row, captureFolder } = found;
      const session: LockedSession = { id: row.id, status: row.status as TerminalSessionStatus, checkoutPath: row.checkoutPath, activeSkill: row.activeSkill, startedAt: row.startedAt, captureFolder };
      return work(session, new DrizzleTerminalEventWriter(database));
    });
  }
}
