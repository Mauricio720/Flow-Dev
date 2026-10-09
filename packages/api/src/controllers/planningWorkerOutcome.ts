import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import { AccountMismatchError, CredentialUnavailableError, RepositoryArchivedError, RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryIdentityMismatchError, RepositoryNotFoundError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../application/github/repositoryErrors";
import { PlanningDomainError } from "../application/services/tasks/planningContracts";
import { planningRetryDelay } from "../application/services/tasks/planningWorkerRules";
import { TaskError } from "../application/services/tasks/taskErrors";

const TRANSIENT_REASONS = ["planning_timeout", "planning_provider_unavailable", "planning_rate_limited", "planning_workspace_unavailable"];
const ACCESS_ERRORS = [ProjectUnavailableError, RepositoryAuthorizationNeededError, RepositoryNotFoundError, RepositoryForbiddenError, RepositoryIdentityMismatchError, RepositoryArchivedError, AccountMismatchError, CredentialUnavailableError];
const DEADLINE_REASON = "planning_deadline";

const STALE_REASON = "stale_execution";
const INVALID_STORED_REASON = "invalid_stored_content";

export type PlanningOutcome = { kind: "fail"; reason: string } | { kind: "requeue"; reason: string; nextRunAt: Date } | { kind: "abandon"; stale: boolean };

export function classifyPlanningError(error: unknown, claim: { attempts: number; deadline: Date }, now: Date): PlanningOutcome {
  const reason = planningReason(error);
  if (reason === STALE_REASON) return { kind: "abandon", stale: true };
  if (reason === null) return { kind: "abandon", stale: false };
  if (!TRANSIENT_REASONS.includes(reason)) return { kind: "fail", reason };
  const delay = planningRetryDelay({ attempts: claim.attempts, now, deadline: claim.deadline, retryAfterSeconds: error instanceof TaskError ? error.retryAfterSeconds : undefined });
  if (!delay.terminal) return { kind: "requeue", reason, nextRunAt: delay.nextRunAt };
  return { kind: "fail", reason: delay.reason === DEADLINE_REASON ? DEADLINE_REASON : reason };
}

function planningReason(error: unknown) {
  if (error instanceof TaskError) return taskReason(error);
  if (error instanceof RepositoryRateLimitedError) return "planning_rate_limited";
  if (error instanceof RepositoryUnavailableError) return "planning_provider_unavailable";
  if (error instanceof PlanningDomainError) return error.reason;
  return ACCESS_ERRORS.some((type) => error instanceof type) ? "planning_access_revoked" : null;
}

function taskReason(error: TaskError) {
  if (error.reason === "workspace_unavailable") return "planning_workspace_unavailable";
  if (error.reason.startsWith("planning_") || error.reason === STALE_REASON || error.reason === INVALID_STORED_REASON) return error.reason;
  return accessReason(error.reason);
}

function accessReason(reason: string) {
  if (["access_revoked", "project_unavailable", "repository_authorization_needed", "identity_mismatch", "destination_unavailable", "issue_permission_denied"].includes(reason)) return "planning_access_revoked";
  if (reason === "provider_rate_limited") return "planning_rate_limited";
  if (reason === "provider_unavailable") return "planning_provider_unavailable";
  return null;
}
