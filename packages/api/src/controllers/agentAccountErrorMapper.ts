import { TRPCError } from "@trpc/server";
import { AgentAccountError } from "../application/services/agent-accounts/agentAccountErrors";
import { WorkAccountError } from "../application/services/agent-accounts/workAccountService";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";

const ERROR_CODES = { label_invalid: "BAD_REQUEST", label_taken: "CONFLICT", stale: "CONFLICT", not_found: "NOT_FOUND", has_open_sessions: "CONFLICT" } as const;

export function mapAgentAccountError(error: unknown): never {
  if (error instanceof AgentAccountError) throw new TRPCError({ code: ERROR_CODES[error.reason], message: error.message, cause: error });
  if (error instanceof WorkAccountError) {
    const code = error.reason === "not_found" ? "NOT_FOUND" : error.reason === "stale" ? "CONFLICT" : "PRECONDITION_FAILED";
    throw new TRPCError({ code, message: error.message, cause: error });
  }
  if (error instanceof AssignedIssueError && error.reason === "operator_required") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a pessoa operadora desta Issue pode agir.", cause: error });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a operação com a conta de IA.", cause: error });
}
