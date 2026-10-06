export type IssueEligibility = { repositoryId: string; owner: string; name: string; publisherGithubId: string; publisherLogin?: string | null; archived: boolean; issuesEnabled: boolean; canRead: boolean; canCreateIssues: boolean };
export type IssueReceipt = { issueId: string; nodeId: string; number: number; url: string; repositoryId: string; publisherGithubId: string; createdAt: string };
export type ApprovedIssueRequest = { repositoryId: string; owner: string; name: string; token: string; publisherGithubId: string; title: string; body: string; labels: string[] };
export type IssueLabelRequest = { owner: string; name: string; token: string; issueNumber: number; labels: string[] };
export type LabelDefinitionRequest = { owner: string; name: string; token: string; label: string; color: string; description: string; overwrite: boolean };
export type LabelDefinitionOutcome = "created" | "updated" | "kept" | "denied";
export type IssueLabelOutcome = "labelled" | "denied" | "missing";
export type CreationOutcome = { status: "created"; receipt: IssueReceipt } | { status: "rejected"; reason: string; retryAfterSeconds?: number } | { status: "uncertain"; reason: string };

export interface GitHubIssueGateway {
  eligibility(input: { repositoryId: string; owner: string; name: string; token: string; publisherGithubId: string }): Promise<IssueEligibility>;
  create(input: ApprovedIssueRequest): Promise<CreationOutcome>;
  verify(input: ApprovedIssueRequest & { issueNumber: number }): Promise<IssueReceipt | null>;
}

export interface GitHubIssueLabelGateway {
  label(input: IssueLabelRequest): Promise<IssueLabelOutcome>;
  define(input: LabelDefinitionRequest): Promise<LabelDefinitionOutcome>;
}
