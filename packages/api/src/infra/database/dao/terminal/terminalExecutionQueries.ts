import { and, count, desc, eq, inArray, lte, max, sql } from "drizzle-orm";
import type { ExecutionArtifactRow, ExecutionAttachmentRow, ExecutionEventCount, ExecutionEventRow } from "../../../../application/database/dao/terminalExecutionDao";
import type { TerminalEventKind } from "../../../../application/terminal/terminalEventKind";
import type { Database } from "../../client";
import { taskArtifactVersions, taskArtifacts, taskTerminalAttachments, taskTerminalEvents } from "../../schema";

export async function queryRecentEvents(database: Database, sessionIds: string[], limit: number): Promise<ExecutionEventRow[]> {
  if (sessionIds.length === 0) return [];
  const ranked = database.select({ sessionId: taskTerminalEvents.sessionId, kind: taskTerminalEvents.kind, summary: taskTerminalEvents.summary, occurredAt: taskTerminalEvents.occurredAt, position: sql<number>`row_number() over (partition by ${taskTerminalEvents.sessionId} order by ${taskTerminalEvents.occurredAt} desc, ${taskTerminalEvents.id} desc)`.as("position") }).from(taskTerminalEvents).where(inArray(taskTerminalEvents.sessionId, sessionIds)).as("ranked");
  const rows = await database.select({ sessionId: ranked.sessionId, kind: ranked.kind, summary: ranked.summary, occurredAt: ranked.occurredAt }).from(ranked).where(lte(ranked.position, limit)).orderBy(ranked.occurredAt);
  return rows.map((row) => ({ ...row, kind: row.kind as TerminalEventKind }));
}

export async function queryEventCounts(database: Database, sessionIds: string[]): Promise<ExecutionEventCount[]> {
  if (sessionIds.length === 0) return [];
  const rows = await database.select({ sessionId: taskTerminalEvents.sessionId, total: count(), lastAt: max(taskTerminalEvents.occurredAt) }).from(taskTerminalEvents).where(inArray(taskTerminalEvents.sessionId, sessionIds)).groupBy(taskTerminalEvents.sessionId);
  return rows.map((row) => ({ ...row, lastAt: row.lastAt ?? null }));
}

export async function queryAttachments(database: Database, sessionIds: string[]): Promise<ExecutionAttachmentRow[]> {
  if (sessionIds.length === 0) return [];
  const rows = await database.select({ sessionId: taskTerminalAttachments.sessionId, name: taskTerminalAttachments.originalName, contentType: taskTerminalAttachments.contentType, byteSize: taskTerminalAttachments.byteSize }).from(taskTerminalAttachments).where(inArray(taskTerminalAttachments.sessionId, sessionIds)).orderBy(taskTerminalAttachments.createdAt, taskTerminalAttachments.originalName);
  return rows.map((row) => ({ ...row, sessionId: row.sessionId! }));
}

export async function queryArtifactSummaries(database: Database, taskId: string): Promise<ExecutionArtifactRow[]> {
  const latest = and(eq(taskArtifactVersions.artifactId, taskArtifacts.id), eq(taskArtifactVersions.version, taskArtifacts.latestVersion));
  return database.select({ id: taskArtifacts.id, path: taskArtifacts.relativePath, skill: taskArtifactVersions.skill, versions: taskArtifacts.latestVersion, updatedAt: taskArtifacts.updatedAt, lastFailure: taskArtifacts.lastFailure }).from(taskArtifacts).leftJoin(taskArtifactVersions, latest).where(eq(taskArtifacts.taskId, taskId)).orderBy(desc(taskArtifacts.updatedAt), taskArtifacts.relativePath);
}
