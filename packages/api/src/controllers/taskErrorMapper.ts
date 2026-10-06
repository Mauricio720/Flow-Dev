import { TRPCError } from "@trpc/server";
import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import { RepositoryAuthorizationNeededError, RepositoryRateLimitedError } from "../application/github/repositoryErrors";
import { RepositoryArchivedError, RepositoryForbiddenError, RepositoryIdentityMismatchError, RepositoryNotFoundError, RepositoryUnavailableError } from "../application/github/repositoryErrors";
import { TaskError } from "../application/services/tasks/taskErrors";

export function mapTaskError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const taskError = normalizeTaskError(error);
  throw new TRPCError({ code: taskErrorCode(taskError.reason), message: taskErrorMessage(taskError.reason), cause: taskError });
}

export function normalizeTaskError(error: unknown) {
  if (error instanceof TaskError) return error;
  if (error instanceof ProjectUnavailableError) return new TaskError("project_unavailable", undefined, error);
  if (error instanceof RepositoryAuthorizationNeededError) return new TaskError("repository_authorization_needed", undefined, error);
  if (error instanceof RepositoryArchivedError) return new TaskError("repository_archived", undefined, error);
  if (error instanceof RepositoryIdentityMismatchError) return new TaskError("identity_mismatch", undefined, error);
  if (error instanceof RepositoryForbiddenError) return new TaskError("issue_permission_denied", undefined, error);
  if (error instanceof RepositoryNotFoundError) return new TaskError("destination_unavailable", undefined, error);
  if (error instanceof RepositoryUnavailableError) return new TaskError("provider_unavailable", undefined, error);
  if (error instanceof RepositoryRateLimitedError) return new TaskError("provider_rate_limited", undefined, error, error.retryAfterSeconds);
  return new TaskError("service_unavailable", undefined, error);
}

function taskErrorCode(reason: TaskError["reason"]): "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "PRECONDITION_FAILED" | "INTERNAL_SERVER_ERROR" | "UNAUTHORIZED" | "TOO_MANY_REQUESTS" {
  if (reason === "session_required") return "UNAUTHORIZED";
  if (reason === "provider_rate_limited" || reason === "planning_capacity" || reason === "planning_rate_limited") return "TOO_MANY_REQUESTS";
  if (["task_unavailable", "project_unavailable", "decision_unavailable"].includes(reason)) return "NOT_FOUND";
  if (reason === "author_required" || reason === "access_revoked") return "FORBIDDEN";
  if (["revision_conflict", "operation_active", "request_key_reused", "task_complete", "stale_proposal", "capture_active", "capture_expired", "attempt_not_uncertain", "refinement_pending", "generation_not_failed", "stale_execution", "planning_conflict", "planning_exists", "planning_retry_required", "planning_not_failed", "planning_approved", "planning_not_ready"].includes(reason)) return "CONFLICT";
  if (["repository_archived", "issues_disabled", "repository_authorization_needed", "destination_unavailable", "identity_mismatch", "issue_permission_denied", "preview_not_ready", "preview_changed", "publication_required"].includes(reason)) return "PRECONDITION_FAILED";
  if (["service_unavailable", "provider_unavailable", "invalid_provider_response", "invalid_stored_content", "planning_unconfigured", "planning_invalid_output", "planning_execution_mismatch", "planning_provider_unavailable", "planning_deadline", "planning_access_revoked"].includes(reason)) return "INTERNAL_SERVER_ERROR";
  return "BAD_REQUEST";
}

function taskErrorMessage(reason: TaskError["reason"]) {
  if (reason === "session_required") return "Sessão necessária";
  if (reason === "author_required") return "Somente a pessoa autora pode alterar esta tarefa";
  if (reason === "task_unavailable" || reason === "project_unavailable") return "Tarefa indisponível";
  return "Não foi possível concluir a operação da tarefa";
}
