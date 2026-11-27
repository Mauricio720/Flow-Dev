import type { TaskErrorReason } from "../tasks/taskErrors";

export const PLAN_REASONS = ["plan_conflict", "plan_invalid_order", "plan_task_unknown", "plan_task_duplicated", "plan_item_started", "plan_limits", "plan_after_order", "plan_run_session_empty", "plan_run_nothing_to_start", "plan_run_active", "plan_run_state", "task_set_unavailable", "plan_control_denied", "choice_invalid", "agent_unavailable", "model_unavailable", "plan_item_blocked", "plan_item_not_ready", "spec_not_found"] as const satisfies readonly TaskErrorReason[];

export type PlanReason = (typeof PLAN_REASONS)[number];
type ErrorCode = "FORBIDDEN" | "PRECONDITION_FAILED" | "CONFLICT" | "BAD_REQUEST" | "NOT_FOUND";

const CODES: Record<PlanReason, ErrorCode> = {
  plan_conflict: "CONFLICT",
  plan_invalid_order: "BAD_REQUEST",
  plan_task_unknown: "BAD_REQUEST",
  plan_task_duplicated: "BAD_REQUEST",
  plan_item_started: "CONFLICT",
  plan_limits: "BAD_REQUEST",
  plan_after_order: "BAD_REQUEST",
  plan_run_session_empty: "PRECONDITION_FAILED",
  plan_run_nothing_to_start: "PRECONDITION_FAILED",
  plan_run_active: "CONFLICT",
  plan_run_state: "CONFLICT",
  task_set_unavailable: "PRECONDITION_FAILED",
  plan_control_denied: "FORBIDDEN",
  choice_invalid: "BAD_REQUEST",
  agent_unavailable: "PRECONDITION_FAILED",
  model_unavailable: "PRECONDITION_FAILED",
  plan_item_blocked: "PRECONDITION_FAILED",
  plan_item_not_ready: "CONFLICT",
  spec_not_found: "NOT_FOUND",
};

const MESSAGES: Record<PlanReason, string> = {
  plan_conflict: "O plano mudou em outra aba. Recarregue para continuar.",
  plan_invalid_order: "A ordem das tarefas no plano não respeita as dependências.",
  plan_task_unknown: "O plano cita tarefas que não estão mais no conjunto de tarefas.",
  plan_task_duplicated: "Cada tarefa pode estar em uma única sessão do plano.",
  plan_item_started: "Uma sessão já iniciada não pode ser alterada nem removida.",
  plan_limits: "O plano aceita até 30 sessões, cada uma com até 30 tarefas.",
  plan_after_order: "Uma sessão começa depois de outra que vem depois dela na ordem.",
  plan_run_session_empty: "Há uma sessão sem tarefas. Adicione tarefas ou remova a sessão.",
  plan_run_nothing_to_start: "Não há sessão a executar no plano.",
  plan_run_active: "O plano já está em execução.",
  plan_run_state: "A execução mudou em outra aba. Recarregue.",
  task_set_unavailable: "Não há um conjunto de tarefas válido nesta tarefa.",
  plan_control_denied: "Só a pessoa operadora da tarefa pode alterar o plano.",
  choice_invalid: "O agente, o modelo ou o esforço escolhido não é válido.",
  agent_unavailable: "O agente escolhido não está disponível nesta máquina.",
  model_unavailable: "O modelo escolhido não está mais disponível no Codex. Troque o modelo da sessão.",
  plan_item_blocked: "A sessão depende de tarefas que ainda não estão concluídas.",
  plan_item_not_ready: "Esta sessão do plano não pode ser iniciada agora.",
  spec_not_found: "A spec escolhida não foi encontrada nesta tarefa.",
};

const MESSAGE_FIELD = "message";

export function isPlanReason(reason: string): reason is PlanReason {
  return (PLAN_REASONS as readonly string[]).includes(reason);
}

export function planErrorCode(reason: string): ErrorCode | undefined {
  return isPlanReason(reason) ? CODES[reason] : undefined;
}

export function planMessage(reason: string, fieldErrors?: Record<string, string>): string | undefined {
  if (!isPlanReason(reason)) return undefined;
  return fieldErrors?.[MESSAGE_FIELD] ?? MESSAGES[reason];
}
