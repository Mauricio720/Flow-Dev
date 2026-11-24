import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import type { CapturedFile, CapturedSpec, TaskSetReadDao } from "../../../../application/database/dao/taskSetReadDao";
import type { Database } from "../../client";
import { taskArtifactVersions, taskArtifacts, tasks } from "../../schema";

const MANIFEST_NAME = "_tasks.md";
const SPEC_NAME = "spec.md";
const SPEC_SKILL = "spec-writer";
const TASK_FILE_PATTERN = /^task_\d{2}\.md$/;

const LIKE_WILDCARD_PATTERN = /[\\%_]/g;
const escapeLike = (text: string) => text.replace(LIKE_WILDCARD_PATTERN, "\\$&");
const namedAs = (name: string) => or(eq(taskArtifacts.relativePath, name), like(taskArtifacts.relativePath, `%/${escapeLike(name)}`));

export class DrizzleTaskSetReadDao implements TaskSetReadDao {
  constructor(private readonly database: Database) {}

  async taskInProject(projectId: string, taskId: string) {
    const [row] = await this.database.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).limit(1);
    return row !== undefined;
  }

  async specs(taskId: string): Promise<CapturedSpec[]> {
    const latest = await this.latestVersions(taskId, namedAs(SPEC_NAME));
    if (latest.length === 0) return [];
    const writers = await this.database.selectDistinct({ artifactId: taskArtifactVersions.artifactId }).from(taskArtifactVersions).where(and(inArray(taskArtifactVersions.artifactId, latest.map((file) => file.artifactId)), eq(taskArtifactVersions.skill, SPEC_SKILL)));
    const written = new Set(writers.map((row) => row.artifactId));
    return latest.filter((file) => written.has(file.artifactId)).map(({ artifactId, path, capturedAt }) => ({ artifactId, path, capturedAt }));
  }

  manifests(taskId: string) {
    return this.latestVersions(taskId, namedAs(MANIFEST_NAME));
  }

  async folderFiles(taskId: string, folder: string) {
    const prefix = folder === "" ? "" : `${folder}/`;
    const candidates = await this.latestVersions(taskId, sql`starts_with(${taskArtifacts.relativePath}, ${prefix}::text)`);
    return candidates.filter((file) => TASK_FILE_PATTERN.test(file.path.slice(prefix.length)));
  }

  private latestVersions(taskId: string, filter: ReturnType<typeof sql> | ReturnType<typeof or>): Promise<CapturedFile[]> {
    return this.database
      .selectDistinctOn([taskArtifacts.id], { artifactId: taskArtifacts.id, path: taskArtifacts.relativePath, version: taskArtifactVersions.version, capturedAt: taskArtifactVersions.capturedAt, content: taskArtifactVersions.content })
      .from(taskArtifacts)
      .innerJoin(taskArtifactVersions, eq(taskArtifactVersions.artifactId, taskArtifacts.id))
      .where(and(eq(taskArtifacts.taskId, taskId), filter))
      .orderBy(taskArtifacts.id, desc(taskArtifactVersions.version));
  }
}
