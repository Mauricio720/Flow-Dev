import type { TaskErrorReason } from "../tasks/taskErrors";

export const SESSION_REASONS = ["session_control_denied", "session_not_active", "request_closed", "request_answered", "message_invalid", "answer_incomplete", "answer_invalid"] as const satisfies readonly TaskErrorReason[];

export type SessionReason = (typeof SESSION_REASONS)[number];
type ErrorCode = "FORBIDDEN" | "PRECONDITION_FAILED" | "CONFLICT" | "BAD_REQUEST";

const CODES: Record<SessionReason, ErrorCode> = {
  session_control_denied: "FORBIDDEN",
  session_not_active: "PRECONDITION_FAILED",
  request_closed: "CONFLICT",
  request_answered: "CONFLICT",
  message_invalid: "BAD_REQUEST",
  answer_incomplete: "BAD_REQUEST",
  answer_invalid: "BAD_REQUEST",
};

const MESSAGES: Record<SessionReason, string> = {
  session_control_denied: "Só quem abriu a sessão, enquanto for a operadora, pode responder.",
  session_not_active: "Esta sessão não está mais ativa.",
  request_closed: "Este pedido não está mais aberto.",
  request_answered: "Este pedido já foi respondido.",
  message_invalid: "A mensagem precisa ter entre 1 e 20.000 caracteres.",
  answer_incomplete: "Responda todas as perguntas antes de enviar.",
  answer_invalid: "A resposta não corresponde às opções do pedido.",
};

export function isSessionReason(reason: string): reason is SessionReason {
  return (SESSION_REASONS as readonly string[]).includes(reason);
}

export function sessionErrorCode(reason: string): ErrorCode | undefined {
  return isSessionReason(reason) ? CODES[reason] : undefined;
}

export function sessionMessage(reason: string): string | undefined {
  return isSessionReason(reason) ? MESSAGES[reason] : undefined;
}
