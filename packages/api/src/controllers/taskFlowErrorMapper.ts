import { TRPCError } from "@trpc/server";
import { mapSpecError } from "./specErrorMapper";
import { TaskFlowError, type TaskFlowReason } from "../application/services/task-flow/taskFlowErrors";

type Code = "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST" | "PRECONDITION_FAILED" | "SERVICE_UNAVAILABLE";

const CODES: Partial<Record<Code, readonly TaskFlowReason[]>> = {
  FORBIDDEN: ["author_required", "access_revoked", "operator_required"],
  NOT_FOUND: ["task_unavailable", "run_unavailable", "evidence_unavailable"],
  CONFLICT: ["plan_version_changed", "idempotency_key_reused", "action_active", "capacity_reached", "action_already_started", "package_version_changed", "preparation_changed"],
  BAD_REQUEST: ["invalid_input", "invalid_cursor", "action_unavailable", "package_unavailable"],
  PRECONDITION_FAILED: ["interaction_unavailable", "claim_required", "claim_unresolved", "issue_ineligible", "board_status_changed", "source_changed", "preparation_required"],
  SERVICE_UNAVAILABLE: ["service_unavailable", "outcome_unknown"],
};

const MESSAGES: Partial<Record<TaskFlowReason, string>> = {
  author_required: "Somente a pessoa autora pode alterar este fluxo",
  operator_required: "Somente a pessoa responsável pode alterar este fluxo",
  claim_required: "Reivindique esta issue para iniciar o fluxo",
  claim_unresolved: "A reivindicação ainda está sendo confirmada",
  issue_ineligible: "A issue não está mais elegível para novas ações",
  board_status_changed: "O status no quadro mudou; atualize antes de continuar",
  source_changed: "A issue mudou. Confirme a nova versão antes de continuar",
  plan_version_changed: "O fluxo mudou. Atualize para ver o estado mais recente",
  action_active: "Já existe uma execução ativa para esta tarefa",
  capacity_reached: "O limite de execuções simultâneas foi atingido",
  legacy_flow_active: "Esta tarefa segue o fluxo anterior de Spec",
  service_unavailable: "Não foi possível concluir a operação do fluxo",
  outcome_unknown: "O resultado ainda está sendo reconciliado",
  interaction_unavailable: "Esta pergunta não está mais aguardando resposta",
};

const DEFAULT_MESSAGE = "Não foi possível iniciar esta ação agora";

function codeFor(reason: TaskFlowReason): Code {
  const entry = (Object.entries(CODES) as [Code, readonly TaskFlowReason[]][]).find(([, reasons]) => reasons.includes(reason));
  return entry?.[0] ?? "PRECONDITION_FAILED";
}

function logUnexpected(error: unknown) {
  const domainError = error instanceof Error && "reason" in error;
  if (!domainError) console.error("[task-flow] unexpected failure", error);
}

export function mapTaskFlowError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  if (!(error instanceof TaskFlowError)) {
    logUnexpected(error);
    mapSpecError(error);
  }
  const flow = error as TaskFlowError;
  throw new TRPCError({ code: codeFor(flow.reason), message: MESSAGES[flow.reason] ?? DEFAULT_MESSAGE, cause: flow });
}
