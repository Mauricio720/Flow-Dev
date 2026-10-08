export type TaskFlowReason =
  | "plan_version_changed"
  | "idempotency_key_reused"
  | "legacy_flow_active"
  | "invalid_input"
  | "task_unavailable"
  | "author_required"
  | "operator_required"
  | "claim_required"
  | "claim_unresolved"
  | "issue_ineligible"
  | "board_status_changed"
  | "source_changed"
  | "access_revoked"
  | "flow_not_eligible"
  | "planning_required"
  | "publication_required"
  | "route_unsupported"
  | "action_unavailable"
  | "action_already_started"
  | "action_active"
  | "capacity_reached"
  | "stage_prerequisite"
  | "software_not_enabled"
  | "auth_required"
  | "catalog_stale"
  | "model_unavailable"
  | "reasoning_effort_unsupported"
  | "connection_unavailable"
  | "worktree_not_ready"
  | "preparation_required"
  | "preparation_changed"
  | "evidence_unavailable"
  | "invalid_cursor"
  | "loop_unavailable"
  | "loop_version_changed"
  | "loop_input_invalid"
  | "loop_runtime_binding_missing"
  | "loop_runtime_binding_invalid"
  | "runtime_incompatible"
  | "outcome_unknown"
  | "run_unavailable"
  | "interaction_unavailable"
  | "package_invalid"
  | "package_version_changed"
  | "package_unavailable"
  | "service_unavailable";

export type TaskFlowDetails = { layer?: string; cause?: string; diagnostics?: string[]; currentVersion?: number; availableModels?: { modelId: string; reasoningChoices: (string | null)[] }[] };

export class TaskFlowError extends Error {
  constructor(readonly reason: TaskFlowReason, readonly current?: { revision: number }, readonly details?: TaskFlowDetails) {
    super(reason);
    this.name = "TaskFlowError";
  }
}
