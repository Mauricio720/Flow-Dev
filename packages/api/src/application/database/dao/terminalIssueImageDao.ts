import type { StoredIssueImage } from "../../services/terminal/issueImageSelection";

export interface TerminalIssueImageDao {
  summaries(taskId: string, imageIds: string[]): Promise<StoredIssueImage[]>;
  content(taskId: string, imageId: string): Promise<Uint8Array | null>;
}
