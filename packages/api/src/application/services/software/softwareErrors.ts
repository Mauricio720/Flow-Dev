export type SoftwareErrorReason =
  | "admin_required"
  | "plan_version_changed"
  | "docs_proxy_required"
  | "docs_proxy_https_required"
  | "max_active_actions_out_of_range"
  | "invalid_input"
  | "label_invalid"
  | "label_taken"
  | "connection_unavailable"
  | "connection_revision_changed"
  | "idempotency_key_reused"
  | "login_in_progress"
  | "operation_unavailable"
  | "operation_forbidden"
  | "operation_not_authenticated"
  | "login_expired"
  | "provider_unsupported"
  | "service_unavailable";

export class SoftwareError extends Error {
  constructor(
    readonly reason: SoftwareErrorReason,
    readonly fieldErrors?: Record<string, string>,
    readonly current?: { revision: number },
  ) {
    super(reason);
    this.name = "SoftwareError";
  }
}
