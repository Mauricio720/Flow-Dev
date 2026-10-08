export type AssignedIssueReason =
  | "board_missing" | "ready_missing" | "repository_authorization_needed" | "provider_unavailable" | "provider_rate_limited"
  | "invalid_cursor" | "issue_unavailable" | "repository_mismatch" | "board_item_invalid" | "issue_ineligible"
  | "in_progress_missing" | "request_key_reused" | "work_unavailable" | "claimant_required" | "claim_unresolved"
  | "stale_fence" | "invalid_input" | "internal_error" | "operator_required" | "board_status_changed" | "source_changed" | "claim_required"
  | "planning_input_limit";

export class AssignedIssueError extends Error {
  constructor(readonly reason: AssignedIssueReason, readonly retryAfterSeconds?: number, cause?: unknown) {
    super(reason, cause === undefined ? undefined : { cause });
    this.name = "AssignedIssueError";
  }
}
