export type IssueDeletionReason =
  | "session_required"
  | "invalid_input"
  | "project_unavailable"
  | "target_unavailable"
  | "operation_unavailable"
  | "forbidden"
  | "precondition_failed"
  | "conflict"
  | "request_key_reused"
  | "github_permission_denied"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "authorization_needed"
  | "identity_conflict"
  | "missing_identity"
  | "invalid_target"
  | "unknown_remote_outcome"
  | "unknown_stop"
  | "uncertain_publication"
  | "repository_access_lost"
  | "stale_fence"
  | "service_unavailable";

export class IssueDeletionError extends Error {
  constructor(readonly reason: IssueDeletionReason, readonly retryAfterSeconds?: number, cause?: unknown) {
    super(reason, cause === undefined ? undefined : { cause });
    this.name = "IssueDeletionError";
  }
}
