import type { TerminalAttachmentDao } from "../../database/dao/terminalAttachmentDao";
import type { AttachmentFileStore } from "../../terminal/attachmentFileStore";
import type { TerminalLog } from "./terminalLaunchLog";

export const STAGING_RETENTION_MS = 24 * 60 * 60 * 1000;
export const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type CleanupDeps = { attachments: TerminalAttachmentDao; files: AttachmentFileStore; log: TerminalLog };

async function removeStale(deps: CleanupDeps, now: Date) {
  const stale = await deps.attachments.staleStaged(new Date(now.getTime() - STAGING_RETENTION_MS));
  for (const attachment of stale) {
    await deps.files.removeStaged(attachment.userId, attachment.storedName);
    await deps.attachments.deleteStaged(attachment.id);
  }
  return stale.length;
}

async function removeExpiredSessions(deps: CleanupDeps, now: Date) {
  const expired = await deps.attachments.staleSessions(new Date(now.getTime() - SESSION_RETENTION_MS));
  for (const session of expired) {
    await deps.files.removeSessionDir(session.id);
    await deps.attachments.markFilesRemoved(session.id);
  }
  return expired.length;
}

export async function cleanupTerminalFiles(deps: CleanupDeps, now: Date) {
  const staged = await removeStale(deps, now);
  const sessions = await removeExpiredSessions(deps, now);
  if (staged + sessions > 0) deps.log.cleanup({ staged, sessions });
  return { staged, sessions };
}
