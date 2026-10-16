import { TRPCError } from "@trpc/server";
import { IssueDeletionError, type IssueDeletionReason } from "../application/services/issue-deletion/issueDeletionErrors";

type Code = "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "PRECONDITION_FAILED" | "INTERNAL_SERVER_ERROR" | "SERVICE_UNAVAILABLE" | "TOO_MANY_REQUESTS" | "UNAUTHORIZED";

const CODES: Record<IssueDeletionReason, Code> = {
  session_required: "UNAUTHORIZED",
  invalid_input: "BAD_REQUEST",
  project_unavailable: "NOT_FOUND",
  target_unavailable: "NOT_FOUND",
  operation_unavailable: "NOT_FOUND",
  forbidden: "FORBIDDEN",
  precondition_failed: "PRECONDITION_FAILED",
  conflict: "CONFLICT",
  request_key_reused: "CONFLICT",
  github_permission_denied: "PRECONDITION_FAILED",
  provider_rate_limited: "TOO_MANY_REQUESTS",
  provider_unavailable: "SERVICE_UNAVAILABLE",
  authorization_needed: "PRECONDITION_FAILED",
  identity_conflict: "CONFLICT",
  missing_identity: "PRECONDITION_FAILED",
  invalid_target: "PRECONDITION_FAILED",
  unknown_remote_outcome: "CONFLICT",
  unknown_stop: "CONFLICT",
  uncertain_publication: "CONFLICT",
  repository_access_lost: "PRECONDITION_FAILED",
  stale_fence: "CONFLICT",
  service_unavailable: "SERVICE_UNAVAILABLE",
};

const MESSAGE = "Não foi possível concluir a exclusão da issue";

export function mapIssueDeletionError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const known = error instanceof IssueDeletionError ? error : new IssueDeletionError("service_unavailable", undefined, error);
  throw new TRPCError({ code: CODES[known.reason], message: MESSAGE, cause: known });
}
