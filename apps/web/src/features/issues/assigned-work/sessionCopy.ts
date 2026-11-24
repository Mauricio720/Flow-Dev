export const CONVERSATION_REGION_LABEL = "Histórico da conversa";
export const JUMP_TO_END_LABEL = "Ir para o fim";
export const NEW_ENTRIES_LABEL = "Novas mensagens";
export const USER_LABEL = "Você";
export const QUEUED_LABEL = "Na fila";
export const UNDELIVERED_LABEL = "Não entregue";
export const CANCELLED_LABEL = "Cancelada";
export const WAITING_FOR_OPERATOR_LABEL = "Aguardando a pessoa operadora";
export const READ_ONLY_NOTE = "Só quem abriu a sessão, enquanto for a operadora, pode responder.";
export const TERMINAL_SESSION_LABEL = "Aberta no terminal";
export const FLOW_DEV_UNCONFIRMED_MESSAGE = "O Flow Dev não conseguiu iniciar a sessão. Confira se o serviço de sessões está rodando.";
export const LOAD_FAILED_NOTE = "Não foi possível atualizar a conversa agora. Tentando de novo.";
export const ACTION_FAILED_MESSAGE = "Não foi possível concluir agora. Tente de novo.";
export const NO_ENTRIES_NOTE = "A conversa aparece aqui assim que o agente responder.";

export const MAX_MESSAGE_LENGTH = 20_000;
export const MAX_FREE_TEXT_LENGTH = 2_000;

export const CHOICE_SINGLE_LABEL = "Escolha uma opção";
export const CHOICE_MULTIPLE_LABEL = "Escolha uma ou mais opções";
export const OTHER_LABEL = "Outra";
export const OTHER_TEXT_LABEL = "Sua resposta";
export const SUBMIT_ANSWERS_LABEL = "Enviar respostas";
export const ANSWERED_LABEL = "Respondida";
export const SECRET_ANSWER_HIDDEN = "(resposta oculta)";
export const ALLOW_LABEL = "Permitir";
export const ALLOW_SESSION_LABEL = "Permitir nesta sessão";
export const DENY_LABEL = "Recusar";
export const DENY_REASON_LABEL = "Motivo da recusa (opcional)";
export const DENY_SEND_LABEL = "Enviar recusa";
export const REASON_LIMIT_MESSAGE = "O motivo pode ter até 2.000 caracteres.";
export const OTHER_LIMIT_MESSAGE = "A resposta pode ter até 2.000 caracteres.";
export const DECISION_LABEL = { allow: "Permitido", allow_session: "Permitido nesta sessão", allow_always: "Permitido sempre", deny: "Recusado" } as const;

export const SEND_LABEL = "Enviar";
export const SENDING_LABEL = "Enviando…";
export const COMPOSER_HINT = "Ctrl+Enter envia; Enter quebra a linha.";
export const MESSAGE_LIMIT_MESSAGE = "A mensagem precisa ter entre 1 e 20.000 caracteres.";
export const INTERRUPT_LABEL = "Interromper";
export const END_LABEL = "Encerrar";
export const END_CONFIRM_MESSAGE = "Encerrar a sessão? O agente para, e a conversa fica só para leitura.";
export const END_CONFIRM_LABEL = "Encerrar sessão";
export const END_CANCEL_LABEL = "Cancelar";

export function allowAlwaysLabel(rule: string) {
  return `Permitir sempre (${rule})`;
}

export function permissionActionLabel(decision: "allow" | "allow_session" | "allow_always" | "deny", scope: "project" | "machine" | null, rule: string | null) {
  if (decision === "allow") return ALLOW_LABEL;
  if (decision === "allow_session") return ALLOW_SESSION_LABEL;
  if (decision === "allow_always" && scope === "machine") return "Permitir sempre (todas as sessões do Codex nesta máquina)";
  if (decision === "allow_always") return allowAlwaysLabel(rule ?? "");
  return DENY_LABEL;
}

export function conversationLabelFor(agent: string) {
  return agent === "codex" ? "Conversa com Codex" : "Conversa com o Claude";
}

export function assistantLabelFor(agent: string) {
  return agent === "codex" ? "Codex" : "Claude";
}

export function composerLabelFor(agent: string) {
  return agent === "codex" ? "Mensagem para Codex" : "Mensagem para o Claude";
}

export function questionLabelFor(agent: string) {
  return agent === "codex" ? "Pergunta do Codex" : "Pergunta do Claude";
}

export function hiddenEntriesNote(count: number) {
  return count === 1 ? "1 entrada anterior não exibida" : `${count} entradas anteriores não exibidas`;
}

export function lengthCounter(length: number, limit: number) {
  return `${length.toLocaleString("pt-BR")} / ${limit.toLocaleString("pt-BR")}`;
}
