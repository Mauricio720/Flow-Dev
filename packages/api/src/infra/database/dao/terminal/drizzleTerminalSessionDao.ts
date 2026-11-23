import { and, eq, notInArray } from "drizzle-orm";
import { FINAL_SESSION_STATUSES } from "../../../../application/terminal/terminalSessionStatus";
import { NO_ATTACHMENT_LINKS, type SessionAttachmentLinks } from "../../../../application/database/dao/terminalAttachmentLinks";
import type { CreateTerminalSessionInput, CreatedTerminalSession, TerminalSessionDao } from "../../../../application/database/dao/terminalSessionDao";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";
import { linkAttachments, releaseAttachments } from "./terminalAttachmentLinks";
import { readLastOpened } from "./terminalLastOpened";
import { readApprovedPlanning } from "./terminalPromptSource";
import { findSessionByRequestKey, insertOrRelaunch, toSessionRecord } from "./terminalSessionWrites";

const LAUNCH_FAILED_STATUS = "launch_failed";

export class DrizzleTerminalSessionDao implements TerminalSessionDao {
  constructor(private readonly database: Database) {}

  approvedPlanning(taskId: string) {
    return readApprovedPlanning(this.database, taskId);
  }

  lastOpened(taskId: string) {
    return readLastOpened(this.database, taskId);
  }

  async findById(sessionId: string) {
    const [row] = await this.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId)).limit(1);
    return row ? toSessionRecord(row) : null;
  }

  findByRequestKey(userId: string, requestKey: string) {
    return findSessionByRequestKey(this.database, userId, requestKey);
  }

  create(input: CreateTerminalSessionInput, links: SessionAttachmentLinks = NO_ATTACHMENT_LINKS): Promise<CreatedTerminalSession> {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      const result = await insertOrRelaunch(database, input);
      if (result.created) await linkAttachments(database, result.session, links);
      return result;
    });
  }

  async hasActiveSession(taskId: string, userId: string) {
    const filter = and(eq(taskTerminalSessions.taskId, taskId), eq(taskTerminalSessions.userId, userId), notInArray(taskTerminalSessions.status, [...FINAL_SESSION_STATUSES]));
    const [row] = await this.database.select({ id: taskTerminalSessions.id }).from(taskTerminalSessions).where(filter).limit(1);
    return row !== undefined;
  }

  markLaunchFailed(sessionId: string, reason: string) {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      await database.update(taskTerminalSessions).set({ launchFailedAt: new Date(), launchError: reason, status: LAUNCH_FAILED_STATUS }).where(eq(taskTerminalSessions.id, sessionId));
      await releaseAttachments(database, sessionId);
    });
  }
}
