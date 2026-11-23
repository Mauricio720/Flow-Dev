import { and, asc, desc, eq } from "drizzle-orm";
import type { ArtifactContent, ArtifactListItem, ArtifactReadDao } from "../../../../application/database/dao/artifactReadDao";
import type { Database } from "../../client";
import { taskArtifactVersions, taskArtifacts, tasks } from "../../schema";

export class DrizzleArtifactReadDao implements ArtifactReadDao {
  constructor(private readonly database: Database) {}

  async taskInProject(projectId: string, taskId: string) {
    const [row] = await this.database.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).limit(1);
    return row !== undefined;
  }

  async list(taskId: string): Promise<ArtifactListItem[]> {
    const artifacts = await this.database.select({ id: taskArtifacts.id, path: taskArtifacts.relativePath }).from(taskArtifacts).where(eq(taskArtifacts.taskId, taskId)).orderBy(asc(taskArtifacts.relativePath));
    const versions = await this.database.select({ artifactId: taskArtifactVersions.artifactId, version: taskArtifactVersions.version, skill: taskArtifactVersions.skill, sessionId: taskArtifactVersions.sessionId, capturedAt: taskArtifactVersions.capturedAt, byteSize: taskArtifactVersions.byteSize }).from(taskArtifactVersions).innerJoin(taskArtifacts, eq(taskArtifacts.id, taskArtifactVersions.artifactId)).where(eq(taskArtifacts.taskId, taskId)).orderBy(asc(taskArtifactVersions.version));
    return artifacts.map((artifact) => ({ ...artifact, versions: versions.filter((row) => row.artifactId === artifact.id).map(({ artifactId: _artifactId, capturedAt, ...row }) => ({ ...row, capturedAt: capturedAt.toISOString() })) }));
  }

  async get(input: { taskId: string; artifactId: string; version?: number }): Promise<ArtifactContent | null> {
    const filters = [eq(taskArtifacts.taskId, input.taskId), eq(taskArtifacts.id, input.artifactId)];
    if (input.version !== undefined) filters.push(eq(taskArtifactVersions.version, input.version));
    const [row] = await this.database.select({ path: taskArtifacts.relativePath, version: taskArtifactVersions.version, skill: taskArtifactVersions.skill, sessionId: taskArtifactVersions.sessionId, capturedAt: taskArtifactVersions.capturedAt, content: taskArtifactVersions.content }).from(taskArtifacts).innerJoin(taskArtifactVersions, eq(taskArtifactVersions.artifactId, taskArtifacts.id)).where(and(...filters)).orderBy(desc(taskArtifactVersions.version)).limit(1);
    return row ? { ...row, capturedAt: row.capturedAt.toISOString() } : null;
  }
}
