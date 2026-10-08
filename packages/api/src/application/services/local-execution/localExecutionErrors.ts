export type LocalExecutionReason =
  | "invalid_input" | "protocol_incompatible" | "pairing_expired" | "pairing_pending"
  | "pairing_consumed" | "pairing_secret_invalid" | "machine_unauthorized" | "request_key_reused"
  | "machine_revoked" | "not_paired" | "connector_unavailable" | "path_invalid"
  | "path_limit" | "path_not_allowed" | "not_git_root" | "repository_mismatch"
  | "link_changed" | "command_unavailable" | "command_expired"
  | "command_payload_changed" | "event_conflict" | "event_gap" | "stale_fence"
  | "runtime_failed" | "runtime_incompatible" | "outcome_unknown" | "instructions_invalid"
  | "gate_policy_unresolved" | "checkout_busy" | "preparation_expired" | "preparation_changed"
  | "evidence_rejected" | "artifact_unsafe" | "artifact_conflict" | "invalid_cursor" | "version_changed" | "catalog_changed"
  | "machine_unavailable" | "project_unavailable" | "link_unavailable" | "interaction_unavailable" | "repository_authorization_needed" | "service_unavailable";

export class LocalExecutionError extends Error {
  constructor(readonly reason: LocalExecutionReason, options?: ErrorOptions) {
    super(reason, options);
    this.name = "LocalExecutionError";
  }
}
