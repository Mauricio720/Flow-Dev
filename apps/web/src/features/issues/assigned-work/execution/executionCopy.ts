import type { StageTabState } from "../stageTabs";

export type ExecutionBadgeVariant = "outline" | "project" | "clarify" | "destructive" | "secondary";
export const EXECUTION_START_CONFIRM = "Iniciar a execução no CompozyOS?";
export const EXECUTION_CANCEL_CONFIRM = "Cancelar esta execução no CompozyOS?";

type ExecutionCopy = { label: string; variant: ExecutionBadgeVariant; tabState: StageTabState; headline: string };

const EXECUTION_COPY: Record<string, ExecutionCopy> = {
  dispatching: { label: "Iniciando", variant: "project", tabState: "current", headline: "CompozyOS está preparando a execução." },
  unavailable: { label: "CompozyOS indisponível", variant: "destructive", tabState: "failed", headline: "Nada foi iniciado no CompozyOS." },
  spec_in_progress: { label: "Gerando spec", variant: "project", tabState: "current", headline: "A spec está sendo gerada no CompozyOS." },
  spec_review: { label: "Spec pronta para revisão", variant: "clarify", tabState: "yours", headline: "A spec aguarda revisão no Flow Dev." },
  in_progress: { label: "Em execução", variant: "project", tabState: "current", headline: "A execução segue no CompozyOS." },
  needs_attention: { label: "Precisa de atenção", variant: "clarify", tabState: "yours", headline: "Resolva a pendência no CompozyOS." },
  completed: { label: "Concluída", variant: "outline", tabState: "done", headline: "A execução foi concluída." },
  failed: { label: "Falhou", variant: "destructive", tabState: "failed", headline: "A execução falhou no CompozyOS." },
  canceled: { label: "Cancelada", variant: "secondary", tabState: "pending", headline: "A execução foi cancelada." },
  rejected: { label: "Rejeitada", variant: "secondary", tabState: "pending", headline: "A execução foi rejeitada." },
};

const BLOCKER_COPY: Record<string, string> = {
  planning_not_approved: "O planejamento não está aprovado.",
  execution_blocked_uncertainty: "Resolva a pendência bloqueante antes de executar.",
  binding_not_ready: "Peça à administração para vincular a pasta local do projeto.",
  repository_archived: "O repositório está arquivado.",
};

const ERROR_COPY: Record<string, string> = {
  compozy_unavailable: "CompozyOS indisponível nesta máquina.",
  claim_required: "Você precisa estar com a tarefa reivindicada.",
  execution_active: "Já existe uma execução em andamento.",
  planning_conflict: "O planejamento mudou; recarregue.",
  binding_not_ready: "Peça à administração para vincular a pasta local do projeto.",
};

const REVIEW_OUTCOME_COPY: Record<string, string> = {
  approved: "Revisão aprovada",
  rejected: "Revisão pediu ajustes",
  blocked: "Revisão bloqueada",
  error: "Erro na revisão",
  timeout: "Revisão expirou",
  invalid_output: "Resposta de revisão inválida",
};

export function executionStatusCopy(state: string): ExecutionCopy {
  return EXECUTION_COPY[state] ?? { label: "Estado desconhecido", variant: "secondary", tabState: "pending", headline: "Atualize para consultar o estado da execução." };
}

export function executionProgressSummary(state: string) {
  const copy = executionStatusCopy(state);
  return { state: copy.tabState, badge: `Execução · ${copy.label}`, headline: copy.headline };
}

export function executionBlockMessage(blocker: string | null) {
  if (!blocker || blocker === "claim_required") return null;
  return BLOCKER_COPY[blocker] ?? "A execução está bloqueada para iniciar.";
}

export function executionErrorMessage(error: unknown, action: "start" | "cancel" = "start") {
  const reason = errorReason(error);
  if (reason === "compozy_unavailable" && action === "cancel") return "Não foi possível cancelar: CompozyOS indisponível.";
  return (reason && ERROR_COPY[reason]) || "Não foi possível concluir a operação. Tente novamente.";
}

export function executionReviewLabel(outcome: string) {
  return REVIEW_OUTCOME_COPY[outcome] ?? `Revisão ${outcome}`;
}

function errorReason(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { data?: { reason?: unknown }; cause?: { reason?: unknown } };
  const reason = record.data?.reason ?? record.cause?.reason;
  return typeof reason === "string" ? reason : null;
}
