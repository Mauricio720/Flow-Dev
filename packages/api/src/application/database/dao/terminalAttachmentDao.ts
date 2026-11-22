export type AttachmentOrigin = "upload" | "issue_image";

export type TerminalAttachmentRecord = {
  id: string;
  taskId: string;
  userId: string;
  sessionId: string | null;
  origin: AttachmentOrigin;
  taskImageId: string | null;
  originalName: string;
  storedName: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  createdAt: Date;
};

export type StageAttachmentInput = {
  taskId: string;
  userId: string;
  originalName: string;
  storedName: string;
  contentType: string;
  byteSize: number;
  sha256: string;
};

export type StageResult = TerminalAttachmentRecord | "duplicate" | "limit_count" | "limit_bytes";
export type StaleSession = { id: string };

export interface TerminalTaskFilesDao {
  sessionIdsOfTask(taskId: string): Promise<string[]>;
  stagedFilesOfTask(taskId: string): Promise<Array<{ userId: string; storedName: string }>>;
}

export interface TerminalAttachmentDao {
  stage(input: StageAttachmentInput): Promise<StageResult>;
  findStaged(userId: string, taskId: string, ids: string[]): Promise<TerminalAttachmentRecord[]>;
  remove(userId: string, attachmentId: string): Promise<TerminalAttachmentRecord | null>;
  staleStaged(before: Date): Promise<TerminalAttachmentRecord[]>;
  deleteStaged(attachmentId: string): Promise<void>;
  staleSessions(before: Date): Promise<StaleSession[]>;
  markFilesRemoved(sessionId: string): Promise<void>;
}
