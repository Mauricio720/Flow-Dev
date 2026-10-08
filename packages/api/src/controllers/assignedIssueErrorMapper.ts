import { TRPCError } from "@trpc/server";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import type { AssignedIssueReason } from "../application/services/assigned-issues/assignedIssueErrors";
import { translateAssignedIssueError } from "../application/services/assigned-issues/assignedIssueTranslation";

type Code = "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "PRECONDITION_FAILED" | "INTERNAL_SERVER_ERROR" | "SERVICE_UNAVAILABLE" | "TOO_MANY_REQUESTS";
const CODES: Record<AssignedIssueReason, Code> = {
  board_missing: "PRECONDITION_FAILED", ready_missing: "PRECONDITION_FAILED", repository_authorization_needed: "PRECONDITION_FAILED",
  repository_mismatch: "PRECONDITION_FAILED", board_item_invalid: "PRECONDITION_FAILED", issue_ineligible: "PRECONDITION_FAILED",
  in_progress_missing: "PRECONDITION_FAILED", claim_unresolved: "PRECONDITION_FAILED", provider_unavailable: "SERVICE_UNAVAILABLE",
  provider_rate_limited: "TOO_MANY_REQUESTS", invalid_cursor: "BAD_REQUEST", invalid_input: "BAD_REQUEST", issue_unavailable: "NOT_FOUND",
  work_unavailable: "NOT_FOUND", request_key_reused: "CONFLICT", stale_fence: "CONFLICT", claimant_required: "FORBIDDEN", internal_error: "INTERNAL_SERVER_ERROR",
  operator_required: "FORBIDDEN", board_status_changed: "PRECONDITION_FAILED", source_changed: "PRECONDITION_FAILED", claim_required: "PRECONDITION_FAILED", planning_input_limit: "PRECONDITION_FAILED",
};
const MESSAGE = "Não foi possível concluir a operação da issue atribuída";

export function mapAssignedIssueError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const normalized = translateAssignedIssueError(error);
  const known = normalized instanceof AssignedIssueError ? normalized : new AssignedIssueError("internal_error", undefined, error);
  throw new TRPCError({ code: CODES[known.reason], message: MESSAGE, cause: known });
}
