export const CONTROL_ERROR_CODES = [
  "auth_required",
  "catalog_stale",
  "model_unavailable",
  "reasoning_effort_unsupported",
  "worktree_not_ready",
  "loop_version_changed",
  "runtime_incompatible",
  "outcome_unknown",
  "service_unavailable",
  "conflict",
] as const;

export type ControlErrorCode = (typeof CONTROL_ERROR_CODES)[number];

export type ControlResult<T> =
  | { ok: true; value: T; release: string }
  | { ok: false; code: ControlErrorCode; release: string | null };

export const controlOk = <T>(value: T, release: string): ControlResult<T> => ({ ok: true, value, release });

export const controlFailure = (code: ControlErrorCode, release: string | null = null): ControlResult<never> => ({
  ok: false,
  code,
  release,
});
