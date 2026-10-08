import type { IssueSourceDao, SourceFacts } from "../../database/dao/issueSourceDao";
import type { VerifiedIssue } from "./assignedIssueRules";
import { sourceContentHash } from "./assignedIssueRules";

export type SourceInput = { projectId: string; actorId: string; issue: VerifiedIssue };

export class IssueSourceService {
  constructor(private readonly sources: IssueSourceDao, private readonly clock: () => Date = () => new Date()) {}

  factsFor(input: SourceInput): SourceFacts {
    const { issue } = input;
    const identity = { projectId: input.projectId, repositoryId: issue.repositoryId, repositoryNodeId: issue.repositoryNodeId, issueNodeId: issue.nodeId };
    const snapshot = { title: issue.title, bodyMarkdown: issue.body, githubUpdatedAt: new Date(issue.updatedAt), contentHash: sourceContentHash({ repositoryId: issue.repositoryId, issueNodeId: issue.nodeId, title: issue.title, bodyMarkdown: issue.body }), verifiedAt: this.clock(), verifiedByUserId: input.actorId };
    return { identity, issueNumber: issue.number, issueUrl: issue.url, snapshot };
  }

  resolve(input: SourceInput) {
    return this.sources.resolve(this.factsFor(input));
  }

  existing(identity: SourceFacts["identity"]) {
    return this.sources.findByIdentity(identity);
  }
}
