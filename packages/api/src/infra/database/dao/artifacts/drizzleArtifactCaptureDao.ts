import { and, desc, eq, gt, isNotNull, like } from "drizzle-orm";
import type { ArtifactCaptureDao, ArtifactCaptureStore, CaptureSession, TouchedFile } from "../../../../application/database/dao/artifactCaptureDao";
import type { Database } from "../../client";
import { taskTerminalEvents, taskTerminalSessions } from "../../schema";
import { findLatestVersion, insertFailure, insertVersion, removeFailure } from "./artifactVersionWrites";

const FILE_EDIT_KIND = "file_edit";
const MARKDOWN_PATTERN = "%.md";

class DrizzleArtifactCaptureStore implements ArtifactCaptureStore {
  constructor(private readonly database: Database) {}

  async touchedSince(sessionId: string, since: Date | null): Promise<TouchedFile[]> {
    const filters = [eq(taskTerminalEvents.sessionId, sessionId), eq(taskTerminalEvents.kind, FILE_EDIT_KIND), isNotNull(taskTerminalEvents.skill), isNotNull(taskTerminalEvents.path), like(taskTerminalEvents.path, MARKDOWN_PATTERN)];
    if (since) filters.push(gt(taskTerminalEvents.occurredAt, since));
    const rows = await this.database.selectDistinctOn([taskTerminalEvents.path], { path: taskTerminalEvents.path, skill: taskTerminalEvents.skill, occurredAt: taskTerminalEvents.occurredAt }).from(taskTerminalEvents).where(and(...filters)).orderBy(taskTerminalEvents.path, desc(taskTerminalEvents.occurredAt));
    return rows.map((row) => ({ path: row.path!, skill: row.skill!, occurredAt: row.occurredAt }));
  }

  latestVersion(taskId: string, relativePath: string) {
    return findLatestVersion(this.database, taskId, relativePath);
  }

  appendVersion(input: Parameters<ArtifactCaptureStore["appendVersion"]>[0]) {
    return insertVersion(this.database, input);
  }

  recordFailure(input: Parameters<ArtifactCaptureStore["recordFailure"]>[0]) {
    return insertFailure(this.database, input);
  }

  clearFailure(taskId: string, relativePath: string) {
    return removeFailure(this.database, taskId, relativePath);
  }

  async markCaptured(sessionId: string, at: Date) {
    await this.database.update(taskTerminalSessions).set({ lastCaptureAt: at }).where(eq(taskTerminalSessions.id, sessionId));
  }
}

export class DrizzleArtifactCaptureDao implements ArtifactCaptureDao {
  constructor(private readonly database: Database) {}

  withCaptureLock<T>(sessionId: string, work: (session: CaptureSession, store: ArtifactCaptureStore) => Promise<T>): Promise<T | null> {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      const [row] = await database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId)).for("update");
      if (!row) return null;
      const session = { id: row.id, taskId: row.taskId, projectId: row.projectId, checkoutPath: row.checkoutPath, lastCaptureAt: row.lastCaptureAt };
      return work(session, new DrizzleArtifactCaptureStore(database));
    });
  }
}
