import { and, count, eq, inArray, isNull, lt, sql, sum } from "drizzle-orm";
import type { StageAttachmentInput, StageResult, TerminalAttachmentDao, TerminalAttachmentRecord, TerminalTaskFilesDao } from "../../../../application/database/dao/terminalAttachmentDao";
import { MAX_ATTACHMENTS, MAX_ATTACHMENTS_TOTAL_BYTES } from "../../../../application/services/terminal/attachmentRules";
import type { Database } from "../../client";
import { taskTerminalAttachments, taskTerminalSessions } from "../../schema";

type Row = typeof taskTerminalAttachments.$inferSelect;
const toRecord = (row: Row) => row as TerminalAttachmentRecord;
const stagedOf = (userId: string, taskId: string) => and(eq(taskTerminalAttachments.userId, userId), eq(taskTerminalAttachments.taskId, taskId), isNull(taskTerminalAttachments.sessionId));

export class DrizzleTerminalAttachmentDao implements TerminalAttachmentDao, TerminalTaskFilesDao {
  constructor(private readonly database: Database) {}

  stage(input: StageAttachmentInput): Promise<StageResult> {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`terminal-staging:${input.userId}:${input.taskId}`}, 0))`);
      const staged = stagedOf(input.userId, input.taskId);
      const [duplicate] = await tx.select({ id: taskTerminalAttachments.id }).from(taskTerminalAttachments).where(and(staged, eq(taskTerminalAttachments.sha256, input.sha256))).limit(1);
      if (duplicate) return "duplicate";
      const [usage] = await tx.select({ files: count(), bytes: sum(taskTerminalAttachments.byteSize) }).from(taskTerminalAttachments).where(staged);
      if (usage!.files >= MAX_ATTACHMENTS) return "limit_count";
      if (Number(usage!.bytes ?? 0) + input.byteSize > MAX_ATTACHMENTS_TOTAL_BYTES) return "limit_bytes";
      const [row] = await tx.insert(taskTerminalAttachments).values({ ...input, origin: "upload" }).returning();
      return toRecord(row!);
    });
  }

  async findStaged(userId: string, taskId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.database.select().from(taskTerminalAttachments).where(and(stagedOf(userId, taskId), inArray(taskTerminalAttachments.id, ids)));
    return rows.map(toRecord);
  }

  async remove(userId: string, attachmentId: string) {
    const filter = and(eq(taskTerminalAttachments.id, attachmentId), eq(taskTerminalAttachments.userId, userId), isNull(taskTerminalAttachments.sessionId));
    const [row] = await this.database.delete(taskTerminalAttachments).where(filter).returning();
    return row ? toRecord(row) : null;
  }

  async staleStaged(before: Date) {
    const rows = await this.database.select().from(taskTerminalAttachments).where(and(isNull(taskTerminalAttachments.sessionId), lt(taskTerminalAttachments.createdAt, before)));
    return rows.map(toRecord);
  }

  async deleteStaged(attachmentId: string) {
    await this.database.delete(taskTerminalAttachments).where(and(eq(taskTerminalAttachments.id, attachmentId), isNull(taskTerminalAttachments.sessionId)));
  }

  staleSessions(before: Date) {
    return this.database.select({ id: taskTerminalSessions.id }).from(taskTerminalSessions).where(and(isNull(taskTerminalSessions.filesRemovedAt), lt(taskTerminalSessions.lastSignalAt, before)));
  }

  async sessionIdsOfTask(taskId: string) {
    const rows = await this.database.select({ id: taskTerminalSessions.id }).from(taskTerminalSessions).where(eq(taskTerminalSessions.taskId, taskId));
    return rows.map((row) => row.id);
  }

  stagedFilesOfTask(taskId: string) {
    const filter = and(eq(taskTerminalAttachments.taskId, taskId), isNull(taskTerminalAttachments.sessionId));
    return this.database.select({ userId: taskTerminalAttachments.userId, storedName: taskTerminalAttachments.storedName }).from(taskTerminalAttachments).where(filter);
  }

  async markFilesRemoved(sessionId: string) {
    await this.database.update(taskTerminalSessions).set({ filesRemovedAt: new Date() }).where(eq(taskTerminalSessions.id, sessionId));
  }
}
