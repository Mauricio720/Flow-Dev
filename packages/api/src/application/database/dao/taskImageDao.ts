export type TaskImageRecord = { id: string; taskId: string | null; projectId: string; contentType: string; byteSize: number; sha256: string; createdAt: Date };
export type TaskImageInput = { taskId: string; projectId: string; uploadedByUserId: string; contentType: string; sha256: string; content: Uint8Array };
export type StagedImageInput = Omit<TaskImageInput, "taskId">;
export type TaskImageStored = { status: "stored"; image: TaskImageRecord } | { status: "limit_reached" };
export type AttachedImage = { id: string; taskId: string; contentType: string };

export interface TaskImageDao {
  store(input: TaskImageInput, limit: number): Promise<TaskImageStored>;
  stage(input: StagedImageInput, limit: number): Promise<TaskImageStored>;
  find(imageId: string): Promise<TaskImageRecord | null>;
  content(imageId: string): Promise<Uint8Array | null>;
  forTask(taskId: string, imageIds: string[]): Promise<AttachedImage[]>;
  attachments(taskId: string): Promise<AttachedImage[]>;
}
