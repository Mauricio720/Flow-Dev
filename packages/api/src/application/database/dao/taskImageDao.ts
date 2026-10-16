export type TaskImageRecord = { id: string; taskId: string; projectId: string; contentType: string; byteSize: number; sha256: string; createdAt: Date };
export type TaskImageInput = { taskId: string; projectId: string; uploadedByUserId: string; contentType: string; sha256: string; content: Uint8Array };
export type TaskImageStored = { status: "stored"; image: TaskImageRecord } | { status: "limit_reached" };

export interface TaskImageDao {
  store(input: TaskImageInput, limit: number): Promise<TaskImageStored>;
  find(imageId: string): Promise<TaskImageRecord | null>;
  content(imageId: string): Promise<Uint8Array | null>;
  forTask(taskId: string, imageIds: string[]): Promise<TaskImageRecord[]>;
}
