import type { TerminalIssueImageDao } from "../../database/dao/terminalIssueImageDao";
import { issueImageReferences, selectIssueImages, type IssueImageChoice } from "./issueImageSelection";

export type ResolvedIssueImage = IssueImageChoice & { sha256: string };

export class IssueImageSelector {
  constructor(private readonly images: TerminalIssueImageDao) {}

  async resolve(taskId: string, issueBody: string): Promise<ResolvedIssueImage[]> {
    const references = issueImageReferences(issueBody);
    const stored = await this.images.summaries(taskId, references.map((reference) => reference.id));
    const hashes = new Map(stored.map((image) => [image.id.toLowerCase(), image.sha256]));
    return selectIssueImages(references, stored).map((choice) => ({ ...choice, sha256: hashes.get(choice.id.toLowerCase())! }));
  }

  async select(taskId: string, issueBody: string): Promise<IssueImageChoice[]> {
    const resolved = await this.resolve(taskId, issueBody);
    return resolved.map(({ sha256: _hash, ...choice }) => choice);
  }

  content(taskId: string, imageId: string) {
    return this.images.content(taskId, imageId);
  }
}
