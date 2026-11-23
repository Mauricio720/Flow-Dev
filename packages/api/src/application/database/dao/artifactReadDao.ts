export type ArtifactVersionSummary = { version: number; skill: string; sessionId: string | null; capturedAt: string; byteSize: number };
export type ArtifactListItem = { id: string; path: string; versions: ArtifactVersionSummary[] };
export type ArtifactContent = { path: string; version: number; skill: string; sessionId: string | null; capturedAt: string; content: string };

export interface ArtifactReadDao {
  taskInProject(projectId: string, taskId: string): Promise<boolean>;
  list(taskId: string): Promise<ArtifactListItem[]>;
  get(input: { taskId: string; artifactId: string; version?: number }): Promise<ArtifactContent | null>;
}
