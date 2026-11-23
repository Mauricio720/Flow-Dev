import { and, desc, eq, sql } from "drizzle-orm";
import type { ArtifactKey, LatestVersion, NewArtifactVersion } from "../../../../application/database/dao/artifactCaptureDao";
import type { Database } from "../../client";
import { taskArtifactVersions, taskArtifacts } from "../../schema";

async function upsertArtifact(database: Database, key: ArtifactKey, failure: string | null): Promise<string> {
  const values = { taskId: key.taskId, projectId: key.projectId, relativePath: key.relativePath, lastFailure: failure };
  const [row] = await database.insert(taskArtifacts).values(values).onConflictDoUpdate({ target: [taskArtifacts.taskId, taskArtifacts.relativePath], set: { lastFailure: failure } }).returning({ id: taskArtifacts.id });
  return row!.id;
}

export async function findLatestVersion(database: Database, taskId: string, relativePath: string): Promise<LatestVersion | null> {
  const filter = and(eq(taskArtifacts.taskId, taskId), eq(taskArtifacts.relativePath, relativePath));
  const [row] = await database.select({ artifactId: taskArtifacts.id, version: taskArtifactVersions.version, sha256: taskArtifactVersions.sha256 }).from(taskArtifacts).innerJoin(taskArtifactVersions, eq(taskArtifactVersions.artifactId, taskArtifacts.id)).where(filter).orderBy(desc(taskArtifactVersions.version)).limit(1);
  return row ?? null;
}

export async function insertVersion(database: Database, input: NewArtifactVersion): Promise<void> {
  const artifactId = await upsertArtifact(database, input, null);
  const [bumped] = await database.update(taskArtifacts).set({ latestVersion: sql`${taskArtifacts.latestVersion} + 1`, updatedAt: input.capturedAt }).where(eq(taskArtifacts.id, artifactId)).returning({ version: taskArtifacts.latestVersion });
  const { skill, sessionId, content, sha256, byteSize, trigger, capturedAt } = input;
  await database.insert(taskArtifactVersions).values({ artifactId, version: bumped!.version, skill, sessionId, content, sha256, byteSize, trigger, capturedAt });
}

export async function insertFailure(database: Database, input: ArtifactKey & { failure: string }): Promise<void> {
  await upsertArtifact(database, input, input.failure);
}

export async function removeFailure(database: Database, taskId: string, relativePath: string): Promise<void> {
  await database.update(taskArtifacts).set({ lastFailure: null }).where(and(eq(taskArtifacts.taskId, taskId), eq(taskArtifacts.relativePath, relativePath)));
}
