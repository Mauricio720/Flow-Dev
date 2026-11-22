export type CopyToSessionInput = { userId: string; storedName: string; attachmentsDir: string; targetName: string };

export interface AttachmentFileStore {
  writeStaged(userId: string, storedName: string, content: Uint8Array): Promise<void>;
  readStaged(userId: string, storedName: string): Promise<Uint8Array>;
  removeStaged(userId: string, storedName: string): Promise<void>;
  copyToSession(input: CopyToSessionInput): Promise<string>;
  writeSessionFile(attachmentsDir: string, targetName: string, content: Uint8Array): Promise<string>;
  removeSessionDir(sessionId: string): Promise<void>;
}
