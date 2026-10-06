import type { SpecClaim } from "../../application/database/dao/taskSpecWorkerDao";
import type { SpecAccessProbe, SpecAccessState } from "../../application/spec/specAccessProbe";
import { ProjectUnavailableError } from "../../application/services/access/projectAccessService";
import { RepositoryArchivedError, RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryIdentityMismatchError, RepositoryNotFoundError } from "../../application/github/repositoryErrors";
import type { RepositoryAccessService } from "../../application/services/projects/repositoryAccessService";

const REVOKING_ERRORS = [ProjectUnavailableError, RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryNotFoundError, RepositoryIdentityMismatchError, RepositoryArchivedError];
const GIT_USERNAME = "x-access-token";

export class GitHubSpecAccessProbe implements SpecAccessProbe {
  constructor(private readonly repositories: RepositoryAccessService) {}

  async check(claim: SpecClaim): Promise<SpecAccessState> {
    try {
      await this.repositories.requirePersonalRead({ userId: claim.authorUserId }, claim.projectId);
      return "granted";
    } catch (error) {
      return REVOKING_ERRORS.some((type) => error instanceof type) ? "revoked" : "unknown";
    }
  }

  async credential(claim: SpecClaim) {
    const { token } = await this.repositories.contextCredentials({ userId: claim.authorUserId }, claim.projectId);
    if (!token) throw new RepositoryAuthorizationNeededError();
    return { username: GIT_USERNAME, password: token };
  }

  async repository(claim: SpecClaim) {
    const repository = await this.repositories.requirePersonalRead({ userId: claim.authorUserId }, claim.projectId);
    return { owner: repository.owner, name: repository.name, nodeId: repository.nodeId };
  }
}
