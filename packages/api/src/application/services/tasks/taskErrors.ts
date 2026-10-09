export type TaskErrorReason =
  | "blank_message" | "input_limit" | "input_capacity" | "invalid_cursor" | "refinement_pending" | "session_required" | "invalid_input"
  | "project_unavailable" | "task_unavailable" | "author_required"
  | "task_complete" | "operation_active" | "revision_conflict" | "generation_not_failed"
  | "request_key_reused" | "invalid_request_key" | "invalid_draft"
  | "unsafe_source" | "invalid_field_path" | "stale_proposal"
  | "preview_not_ready" | "preview_changed" | "repository_archived"
  | "issues_disabled" | "repository_authorization_needed" | "destination_unavailable" | "identity_mismatch"
  | "issue_permission_denied" | "attempt_not_uncertain" | "wrong_attempt"
  | "invalid_stored_content" | "service_unavailable" | "stale_execution" | "content_rejected"
  | "invalid_agent_output" | "invalid_agent_source" | "invalid_agent_activity" | "execution_mismatch" | "generation_timeout"
  | "invalid_path" | "invalid_query" | "unsupported_context" | "context_limit"
  | "capability_invalid" | "access_revoked" | "tool_key_reused"
  | "capture_active" | "capture_expired" | "capture_invalid" | "invalid_audio"
  | "audio_too_large" | "unsupported_audio_type" | "transcription_capacity" | "provider_rate_limited"
  | "provider_unavailable" | "provider_usage_limit" | "invalid_provider_response" | "no_speech"
  | "transcription_timeout" | "origin_denied" | "transcription_unconfigured"
  | "publication_required" | "planning_input_limit" | "planning_invalid_output" | "planning_conflict" | "planning_unconfigured"
  | "planning_execution_mismatch" | "planning_provider_unavailable" | "planning_rate_limited" | "planning_capacity" | "planning_exists"
  | "planning_retry_required" | "planning_not_failed" | "planning_approved" | "planning_not_ready" | "decision_unavailable"
  | "planning_deadline" | "planning_access_revoked" | "planning_timeout" | "planning_workspace_unavailable"
  | "spec_unavailable" | "planning_required" | "stage_prerequisite" | "route_unsupported" | "package_incomplete" | "decision_blocked"
  | "workspace_unavailable" | "runtime_incompatible" | "runtime_unconfigured" | "permission_out_of_scope" | "spec_conflict" | "attempt_active"
  | "outcome_unknown" | "interaction_stale" | "interaction_resolved" | "artifact_conflict" | "stage_approved" | "invalid_answer"
  | "invalid_permission" | "spec_capacity" | "interaction_queue_full" | "package_limit" | "artifact_invalid" | "capture_failed"
  | "runtime_failed" | "resource_limit" | "admin_required" | "operator_required" | "claim_unresolved" | "issue_ineligible" | "board_status_changed"
  | "source_changed" | "work_unavailable";

export class TaskError extends Error {
  constructor(readonly reason: TaskErrorReason, readonly fieldErrors?: Record<string, string>, cause?: unknown, readonly retryAfterSeconds?: number) {
    super(reason, cause === undefined ? undefined : { cause });
    this.name = "TaskError";
  }
}
