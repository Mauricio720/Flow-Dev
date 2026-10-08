import { TRPCError } from "@trpc/server";
import { LocalExecutionError, type LocalExecutionReason } from "../application/services/local-execution/localExecutionErrors";

type TrpcCode = "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "PRECONDITION_FAILED" | "UNAUTHORIZED" | "FORBIDDEN" | "SERVICE_UNAVAILABLE";
const MAP: Partial<Record<LocalExecutionReason, TrpcCode>> = {
  invalid_input: "BAD_REQUEST",
  invalid_cursor: "BAD_REQUEST",
  pairing_expired: "NOT_FOUND",
  pairing_consumed: "CONFLICT",
  request_key_reused: "CONFLICT",
  machine_unavailable: "NOT_FOUND",
  machine_unauthorized: "UNAUTHORIZED",
  version_changed: "CONFLICT",
  preparation_expired: "PRECONDITION_FAILED",
  preparation_changed: "PRECONDITION_FAILED",
  artifact_conflict: "CONFLICT",
  link_changed: "CONFLICT",
  project_unavailable: "NOT_FOUND",
  link_unavailable: "NOT_FOUND",
  repository_mismatch: "PRECONDITION_FAILED",
  machine_revoked: "PRECONDITION_FAILED",
  protocol_incompatible: "PRECONDITION_FAILED",
  repository_authorization_needed: "PRECONDITION_FAILED",
  connector_unavailable: "SERVICE_UNAVAILABLE",
};

export function mapLocalExecutionError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const reason = reasonOf(error);
  const localError = error instanceof LocalExecutionError ? error : reason ? new LocalExecutionError(reason) : new LocalExecutionError("service_unavailable");
  throw new TRPCError({ code: MAP[localError.reason] ?? "SERVICE_UNAVAILABLE", message: safeMessage(localError.reason), cause: localError });
}

export function localErrorReason(error: unknown): LocalExecutionReason | null {
  return reasonOf(error);
}

function reasonOf(error: unknown): LocalExecutionReason | null {
  const value = error instanceof LocalExecutionError ? error.reason : error instanceof Error ? error.message : "";
  const known: LocalExecutionReason[] = ["invalid_input", "protocol_incompatible", "pairing_expired", "pairing_pending", "pairing_consumed", "pairing_secret_invalid", "machine_unauthorized", "machine_revoked", "not_paired", "connector_unavailable", "path_invalid", "path_limit", "path_not_allowed", "not_git_root", "repository_mismatch", "link_changed", "request_key_reused", "command_unavailable", "command_expired", "command_payload_changed", "event_conflict", "event_gap", "stale_fence", "runtime_failed", "runtime_incompatible", "outcome_unknown", "instructions_invalid", "gate_policy_unresolved", "checkout_busy", "preparation_expired", "preparation_changed", "evidence_rejected", "artifact_unsafe", "artifact_conflict", "invalid_cursor", "version_changed", "machine_unavailable", "project_unavailable", "link_unavailable", "repository_authorization_needed", "service_unavailable"];
  return known.includes(value as LocalExecutionReason) ? value as LocalExecutionReason : null;
}

function safeMessage(reason: LocalExecutionReason) {
  if (reason === "service_unavailable") return "Não foi possível concluir a operação local";
  return "Não foi possível concluir a operação solicitada";
}
