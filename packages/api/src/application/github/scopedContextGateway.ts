import type { RepositoryIdentity } from "../database/dao/projectDao";

export type IssueContextRequest =
  | { tool: "searchProject"; query: string }
  | { tool: "readProjectFile"; path: string; fromLine: number; toLine: number }
  | { tool: "searchGitHubIssues"; query: string }
  | { tool: "getGitHubIssue"; issueNumber: number };

export type ScopedEvidence = {
  type: "project-file" | "github-issue";
  path: string | null;
  commitSha: string | null;
  fromLine: number | null;
  toLine: number | null;
  issueId: string | null;
  issueNumber: number | null;
  url: string | null;
  sourceHash: string;
  excerpt: string;
};

export type ScopedContextResult = { status: "done" | "empty" | "unavailable"; data: unknown; evidence: ScopedEvidence[]; reason?: string };

export interface ScopedContextGateway {
  pinCommit(input: { token: string; repository: RepositoryIdentity; defaultBranch: string }): Promise<string>;
  execute(input: { token: string; repository: RepositoryIdentity; commitSha: string; request: IssueContextRequest }): Promise<ScopedContextResult>;
}
