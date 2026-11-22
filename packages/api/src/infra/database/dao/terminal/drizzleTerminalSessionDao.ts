import { eq } from "drizzle-orm";
import { NO_ATTACHMENT_LINKS, type SessionAttachmentLinks } from "../../../../application/database/dao/terminalAttachmentLinks";
import type { CreateTerminalSessionInput, CreatedTerminalSession, TerminalSessionDao } from "../../../../application/database/dao/terminalSessionDao";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";
import { linkAttachments, releaseAttachments } from "./terminalAttachmentLinks";
import { readLastOpened } from "./terminalLastOpened";
import { readApprovedPlanning } from "./terminalPromptSource";
import { findSessionByRequestKey, insertOrRelaunch } from "./terminalSessionWrites";

export class DrizzleTerminalSessionDao implements TerminalSessionDao {
  constructor(private readonly database: Database) {}

  approvedPlanning(taskId: string) {
    return readApprovedPlanning(this.database, taskId);
  }

  lastOpened(taskId: string) {
    return readLastOpened(this.database, taskId);
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

  markLaunchFailed(sessionId: string, reason: string) {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      await database.update(taskTerminalSessions).set({ launchFailedAt: new Date(), launchError: reason }).where(eq(taskTerminalSessions.id, sessionId));
      await releaseAttachments(database, sessionId);
    });
  }
}
