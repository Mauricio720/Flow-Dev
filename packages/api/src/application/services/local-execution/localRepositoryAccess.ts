import type { SessionPrincipal } from "../../../context";
import { RepositoryArchivedError, RepositoryAuthorizationNeededError, RepositoryNotFoundError } from "../../github/repositoryErrors";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { LocalExecutionError } from "./localExecutionErrors";

export async function resolveLocalRepository(repositories: RepositoryAccessService, actor: SessionPrincipal, projectId: string) {
  try {
    return await repositories.requirePersonalRead(actor, projectId);
  } catch (error) {
    if (error instanceof RepositoryAuthorizationNeededError) throw new LocalExecutionError("repository_authorization_needed");
    if (error instanceof RepositoryNotFoundError) throw new LocalExecutionError("project_unavailable");
    if (error instanceof RepositoryArchivedError) throw new LocalExecutionError("repository_mismatch");
    throw error;
  }
}
