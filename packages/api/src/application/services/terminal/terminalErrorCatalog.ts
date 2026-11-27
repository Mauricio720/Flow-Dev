import type { TaskErrorReason } from "../tasks/taskErrors";

export const TERMINAL_REASONS = ["planning_not_approved", "checkout_missing", "checkout_invalid", "skill_missing", "claude_unavailable", "session_service_offline", "terminal_disabled", "session_already_active", "prompt_invalid", "attachment_missing", "attachment_limit", "account_not_owned", "account_removed"] as const satisfies readonly TaskErrorReason[];

export type TerminalReason = (typeof TERMINAL_REASONS)[number];
export type TerminalErrorDetails = Record<string, string> | undefined;
export const OPERATOR_REQUIRED_MESSAGE = "Somente a pessoa operadora desta Issue pode agir.";
export const LAUNCH_FAILED_KIND = "launch_failed";
export const SESSION_SERVICE_OFFLINE_MESSAGE = "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.";
export const TOTAL_SIZE_KIND = "total_size";
export const SESSION_ALREADY_ACTIVE_MESSAGE = "Já existe uma sessão aberta para esta tarefa. Abrir outra?";

const PRECONDITION_REASONS = new Set<string>(["planning_not_approved", "checkout_missing", "checkout_invalid", "skill_missing", "claude_unavailable", "session_service_offline", "terminal_disabled", "attachment_missing", "account_not_owned", "account_removed"]);

export function isTerminalReason(reason: string): reason is TerminalReason {
  return (TERMINAL_REASONS as readonly string[]).includes(reason);
}

export function terminalErrorCode(reason: string) {
  if (!isTerminalReason(reason)) return undefined;
  if (reason === "session_already_active") return "CONFLICT";
  return PRECONDITION_REASONS.has(reason) ? "PRECONDITION_FAILED" : "BAD_REQUEST";
}

function attachmentLimit(details: TerminalErrorDetails) {
  return details?.kind === TOTAL_SIZE_KIND ? "Os anexos passariam de 30 MB." : "Limite de 10 arquivos por abertura.";
}

export function terminalMessage(reason: string, details?: TerminalErrorDetails): string | undefined {
  if (reason === "planning_not_approved") return "O planejamento ainda não foi aprovado. Aprove a rota antes de abrir a execução no terminal.";
  if (reason === "checkout_missing") return "Você ainda não vinculou o clone local deste projeto. Vincule a pasta nas Configurações para abrir a execução.";
  if (reason === "checkout_invalid") return `A pasta vinculada não é mais um clone válido de ${details?.repository}. Atualize o vínculo nas Configurações.`;
  if (reason === "skill_missing") return `Skill ${details?.name} não encontrada no Flow Dev.`;
  if (reason === "claude_unavailable") return "Claude Code não encontrado no PATH.";
  if (reason === "session_service_offline") return SESSION_SERVICE_OFFLINE_MESSAGE;
  return terminalMessageRest(reason, details);
}

function terminalMessageRest(reason: string, details: TerminalErrorDetails) {
  if (reason === "terminal_disabled") return "A abertura no terminal está desligada. Defina FLOW_DEV_TERMINAL_ENABLED=true no .env.local e reinicie o Flow Dev.";
  if (reason === "session_already_active") return SESSION_ALREADY_ACTIVE_MESSAGE;
  if (reason === "prompt_invalid") return "O prompt precisa ter entre 1 e 20.000 caracteres.";
  if (reason === "attachment_missing") return "Um dos anexos não está mais disponível. Anexe de novo e tente outra vez.";
  if (reason === "account_not_owned" || reason === "account_removed") return details?.message;
  return reason === "attachment_limit" ? attachmentLimit(details) : undefined;
}
