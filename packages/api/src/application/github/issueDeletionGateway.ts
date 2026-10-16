import type { FrozenIssueIdentity } from "../services/issue-deletion/issueDeletionContracts";

export type IssueFacts = {
  nodeId: string;
  number: number;
  title: string;
  repositoryId: string;
  repositoryNodeId: string;
  repositoryOwner: string;
  repositoryName: string;
  authorDatabaseId: string | null;
  viewerCanDelete: boolean;
};

export type ProviderFailure =
  | { kind: "github_permission_denied" }
  | { kind: "provider_rate_limited"; retryAfterSeconds: number }
  | { kind: "provider_unavailable" }
  | { kind: "authorization_needed" }
  | { kind: "identity_conflict" }
  | { kind: "invalid_target" }
  | { kind: "not_found" };

export type InspectExpectation = { repositoryId?: string; repositoryNodeId?: string };

export interface GitHubIssueDeletionGateway {
  inspect(token: string, issueNodeId: string, expected?: InspectExpectation): Promise<IssueFacts | ProviderFailure>;
  remove(token: string, issueNodeId: string): Promise<"accepted" | ProviderFailure>;
  absence(token: string, target: FrozenIssueIdentity): Promise<"present" | "absent" | ProviderFailure>;
}
