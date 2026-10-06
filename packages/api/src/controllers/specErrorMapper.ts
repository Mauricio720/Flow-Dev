import { TRPCError } from "@trpc/server";
import { TaskError, type TaskErrorReason } from "../application/services/tasks/taskErrors";
import { normalizeTaskError } from "./taskErrorMapper";

type Code = "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "PRECONDITION_FAILED" | "INTERNAL_SERVER_ERROR" | "UNAUTHORIZED" | "TOO_MANY_REQUESTS";

const CODES: Record<Code, readonly TaskErrorReason[]> = {
  UNAUTHORIZED: ["session_required"],
  NOT_FOUND: ["spec_unavailable"],
  FORBIDDEN: ["author_required", "access_revoked"],
  PRECONDITION_FAILED: ["repository_authorization_needed", "planning_required", "publication_required", "stage_prerequisite", "route_unsupported", "package_incomplete", "decision_blocked", "workspace_unavailable", "runtime_incompatible", "runtime_unconfigured", "permission_out_of_scope", "repository_archived", "identity_mismatch", "destination_unavailable", "issue_permission_denied"],
  CONFLICT: ["spec_conflict", "request_key_reused", "attempt_active", "outcome_unknown", "interaction_stale", "interaction_resolved", "artifact_conflict", "stage_approved"],
  BAD_REQUEST: ["invalid_input", "invalid_cursor", "invalid_answer", "invalid_permission"],
  TOO_MANY_REQUESTS: ["spec_capacity", "provider_rate_limited", "interaction_queue_full"],
  INTERNAL_SERVER_ERROR: ["service_unavailable"],
};

const MESSAGES: Partial<Record<TaskErrorReason, string>> = {
  session_required: "Sessão necessária",
  spec_unavailable: "Spec indisponível",
  author_required: "Somente a pessoa autora pode alterar esta Spec",
  access_revoked: "O acesso a este projeto foi removido",
  repository_authorization_needed: "Conecte sua conta do GitHub para continuar",
  spec_conflict: "A Spec mudou. Atualize para ver o estado mais recente",
  request_key_reused: "Esta solicitação já foi usada com outros dados",
  spec_capacity: "Há muitas Specs em execução. Tente novamente em instantes",
  service_unavailable: "Não foi possível concluir a operação da Spec",
};

const ASYNC_REASONS: readonly TaskErrorReason[] = ["context_limit", "package_limit", "artifact_invalid", "capture_failed", "runtime_failed", "runtime_incompatible", "access_revoked", "resource_limit", "provider_rate_limited", "artifact_conflict", "outcome_unknown", "workspace_unavailable", "repository_authorization_needed", "stage_prerequisite"];

const DEFAULT_MESSAGE = "Não foi possível concluir a operação da Spec";
const UNAVAILABLE_ALIASES: readonly TaskErrorReason[] = ["task_unavailable", "project_unavailable"];
const SAFE_FALLBACK_ALIASES: readonly TaskErrorReason[] = ["provider_unavailable", "invalid_provider_response", "invalid_stored_content", "service_unavailable"];

export function normalizeSpecError(error: unknown) {
  const normalized = normalizeTaskError(error);
  if (UNAVAILABLE_ALIASES.includes(normalized.reason)) return new TaskError("spec_unavailable");
  if (SAFE_FALLBACK_ALIASES.includes(normalized.reason) || !isKnownReason(normalized.reason)) return new TaskError("service_unavailable");
  return normalized;
}

export function mapSpecError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const taskError = normalizeSpecError(error);
  throw new TRPCError({ code: specErrorCode(taskError.reason), message: MESSAGES[taskError.reason] ?? DEFAULT_MESSAGE, cause: taskError });
}

export function attemptFailureReason(error: unknown) {
  const normalized = normalizeTaskError(error);
  return ASYNC_REASONS.includes(normalized.reason) ? normalized.reason : normalizeSpecError(error).reason;
}

function isKnownReason(reason: TaskErrorReason) {
  return Object.values(CODES).some((reasons) => reasons.includes(reason));
}

export function specErrorCode(reason: TaskErrorReason): Code {
  const entry = (Object.entries(CODES) as [Code, readonly TaskErrorReason[]][]).find(([, reasons]) => reasons.includes(reason));
  return entry?.[0] ?? "INTERNAL_SERVER_ERROR";
}
