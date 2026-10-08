import { ProjectUnavailableError } from "../access/projectAccessService";
import { ProjectBoardNotFoundError } from "../../github/projectBoardGateway";
import { RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryNotFoundError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../../github/repositoryErrors";
import { AssignedIssueError } from "./assignedIssueErrors";

export function translateAssignedIssueError(error: unknown): unknown {
  if (error instanceof AssignedIssueError) return error;
  if (error instanceof ProjectUnavailableError || error instanceof RepositoryNotFoundError) return new AssignedIssueError("work_unavailable", undefined, error);
  if (error instanceof RepositoryAuthorizationNeededError) return new AssignedIssueError("repository_authorization_needed", undefined, error);
  if (error instanceof RepositoryRateLimitedError) return new AssignedIssueError("provider_rate_limited", error.retryAfterSeconds, error);
  if (error instanceof RepositoryUnavailableError) return new AssignedIssueError("provider_unavailable", undefined, error);
  if (error instanceof ProjectBoardNotFoundError || error instanceof RepositoryForbiddenError) return new AssignedIssueError("board_missing", undefined, error);
  return error;
}

export async function translated<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) { throw translateAssignedIssueError(error); }
}
