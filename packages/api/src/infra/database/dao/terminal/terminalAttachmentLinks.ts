import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { SessionAttachmentLinks } from "../../../../application/database/dao/terminalAttachmentLinks";
import type { TerminalSessionRecord } from "../../../../application/database/dao/terminalSessionDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { Database } from "../../client";
import { taskTerminalAttachments } from "../../schema";

const ISSUE_IMAGE_ORIGIN = "issue_image";
const UPLOAD_ORIGIN = "upload";

export async function linkAttachments(database: Database, session: TerminalSessionRecord, links: SessionAttachmentLinks) {
  if (links.uploadIds.length > 0) {
    const owned = and(inArray(taskTerminalAttachments.id, links.uploadIds), eq(taskTerminalAttachments.userId, session.userId), eq(taskTerminalAttachments.taskId, session.taskId), isNull(taskTerminalAttachments.sessionId));
    const linked = await database.update(taskTerminalAttachments).set({ sessionId: session.id }).where(owned).returning({ id: taskTerminalAttachments.id });
    if (linked.length !== links.uploadIds.length) throw new TaskError("attachment_missing");
  }
  if (links.issueImages.length === 0) return;
  const rows = links.issueImages.map((image) => ({ ...image, taskId: session.taskId, userId: session.userId, sessionId: session.id, origin: ISSUE_IMAGE_ORIGIN }));
  await database.insert(taskTerminalAttachments).values(rows);
}

export async function releaseAttachments(database: Database, sessionId: string) {
  await database.delete(taskTerminalAttachments).where(and(eq(taskTerminalAttachments.sessionId, sessionId), eq(taskTerminalAttachments.origin, ISSUE_IMAGE_ORIGIN)));
  await database.execute(sql`
    update task_terminal_attachments as moved set session_id = null
    where moved.session_id = ${sessionId} and moved.origin = ${UPLOAD_ORIGIN}
    and not exists (select 1 from task_terminal_attachments as other where other.user_id = moved.user_id and other.task_id = moved.task_id and other.sha256 = moved.sha256 and other.session_id is null)`);
}
