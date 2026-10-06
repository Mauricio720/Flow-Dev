import type { RepositoryIdentity } from "../../database/dao/projectDao";
import type { GitHubRepositoryGateway } from "../../github/repositoryGateway";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import { RepositoryAuthorizationNeededError, RepositoryIdentityMismatchError, RepositoryNotFoundError } from "../../github/repositoryErrors";

type Input = { userId: string; repository: RepositoryIdentity; authorization: RepositoryAuthorizationService; github: GitHubRepositoryGateway };

export async function resolveProjectRepository(input: Input) {
  const token = await input.authorization.accessToken(input.userId);
  const saved = input.repository;
  try {
    const repository = token
      ? await input.github.resolve(token, saved.nodeId)
      : await input.github.resolvePath("", saved.owner, saved.name, saved.githubId);
    if (repository.githubId !== saved.githubId) throw new RepositoryIdentityMismatchError();
    if (!token && repository.visibility !== "public") throw new RepositoryAuthorizationNeededError();
    return { repository, token: token ?? "" };
  } catch (error) {
    if (!token && error instanceof RepositoryNotFoundError) throw new RepositoryAuthorizationNeededError();
    throw error;
  }
}
