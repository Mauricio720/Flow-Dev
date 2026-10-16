import type { GitHubIssueDeletionGateway, IssueFacts, ProviderFailure } from "../../application/github/issueDeletionGateway";
import type { RepositoryAuthorizationService } from "../../application/github/repositoryAuthorizationService";
import type { DeletionFailureReason } from "../../application/services/issue-deletion/issueDeletionContracts";
import type { DeletionProvider, ProviderInspectTarget, ProviderOutcome } from "../../application/services/issue-deletion/deletionPorts";

export class GitHubDeletionProvider implements DeletionProvider {
  constructor(private readonly gateway: GitHubIssueDeletionGateway, private readonly authorization: RepositoryAuthorizationService) {}

  async tokenFor(operation: { initiatorUserId: string }): Promise<string | null> {
    try {
      return await this.authorization.accessToken(operation.initiatorUserId);
    } catch {
      return null;
    }
  }

  async inspect(token: string, target: ProviderInspectTarget): Promise<ProviderOutcome<IssueFacts>> {
    return mapOutcome(await this.gateway.inspect(token, target.issueNodeId, { repositoryId: target.repositoryId, repositoryNodeId: target.repositoryNodeId }));
  }

  async remove(token: string, target: ProviderInspectTarget): Promise<ProviderOutcome<"accepted">> {
    return mapOutcome(await this.gateway.remove(token, target.issueNodeId));
  }

  async absence(token: string, target: ProviderInspectTarget): Promise<ProviderOutcome<"present" | "absent">> {
    return mapOutcome(await this.gateway.absence(token, { repositoryId: target.repositoryId, repositoryNodeId: target.repositoryNodeId, issueNodeId: target.issueNodeId, issueNumber: target.issueNumber }));
  }
}

export function mapOutcome<T>(outcome: T | ProviderFailure): ProviderOutcome<T> {
  if (outcome && typeof outcome === "object" && "kind" in outcome && typeof (outcome as ProviderFailure).kind === "string") {
    const failure = outcome as ProviderFailure;
    return { ok: false, failure: mapProviderFailure(failure), ...(failure.kind === "provider_rate_limited" ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) };
  }
  return { ok: true, value: outcome as T };
}

export function mapProviderFailure(failure: ProviderFailure): DeletionFailureReason {
  switch (failure.kind) {
    case "github_permission_denied": return "github_permission_denied";
    case "provider_rate_limited": return "provider_rate_limited";
    case "authorization_needed": return "authorization_needed";
    case "identity_conflict": return "identity_conflict";
    case "invalid_target": return "invalid_target";
    case "not_found": return "repository_access_lost";
    default: return "provider_unavailable";
  }
}
