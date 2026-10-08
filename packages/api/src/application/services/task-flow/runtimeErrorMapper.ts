import { TaskFlowError, type TaskFlowReason } from "./taskFlowErrors";

export type RuntimeFailure = { status: number; body?: unknown };

const AUTH_STATUSES = [401, 403];
const UNPROCESSABLE_STATUS = 422;
const SERVER_ERROR_FLOOR = 500;
const KNOWN_CODES: Record<string, TaskFlowReason> = {
  model_unavailable: "model_unavailable",
  reasoning_effort_unsupported: "reasoning_effort_unsupported",
  worktree_not_ready: "worktree_not_ready",
  loop_version_changed: "loop_version_changed",
};

function codeFrom(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const code = (body as { code?: unknown; error?: { code?: unknown } }).code ?? (body as { error?: { code?: unknown } }).error?.code;
  return typeof code === "string" ? code : null;
}

export function mapRuntimeFailure(failure: RuntimeFailure): TaskFlowError {
  const known = KNOWN_CODES[codeFrom(failure.body) ?? ""];
  if (known) return new TaskFlowError(known);
  if (AUTH_STATUSES.includes(failure.status)) return new TaskFlowError("auth_required");
  if (failure.status === UNPROCESSABLE_STATUS) return new TaskFlowError("model_unavailable");
  if (failure.status >= SERVER_ERROR_FLOOR) return new TaskFlowError("outcome_unknown");
  return new TaskFlowError("runtime_incompatible");
}
