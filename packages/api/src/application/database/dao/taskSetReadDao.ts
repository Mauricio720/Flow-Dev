export type CapturedFile = { artifactId: string; path: string; version: number; capturedAt: Date; content: string };
export type CapturedSpec = { artifactId: string; path: string; capturedAt: Date };

export interface TaskSetReadDao {
  taskInProject(projectId: string, taskId: string): Promise<boolean>;
  specs(taskId: string): Promise<CapturedSpec[]>;
  manifests(taskId: string): Promise<CapturedFile[]>;
  folderFiles(taskId: string, folder: string): Promise<CapturedFile[]>;
}
