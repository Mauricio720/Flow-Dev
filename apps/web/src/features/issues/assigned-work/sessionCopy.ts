export const CONVERSATION_LABEL = "Conversa com o Claude";
export const USER_LABEL = "Você";
export const ASSISTANT_LABEL = "Claude";
export const QUEUED_LABEL = "Na fila";
export const UNDELIVERED_LABEL = "Não entregue";
export const CANCELLED_LABEL = "Cancelada";
export const WAITING_FOR_OPERATOR_LABEL = "Aguardando a pessoa operadora";
export const READ_ONLY_NOTE = "Só quem abriu a sessão, enquanto for a operadora, pode responder.";
export const TERMINAL_SESSION_LABEL = "Aberta no terminal";
export const FLOW_DEV_UNCONFIRMED_MESSAGE = "O Flow Dev não conseguiu iniciar o Claude. Confira se o serviço de sessões está rodando.";
export const LOAD_FAILED_NOTE = "Não foi possível atualizar a conversa agora. Tentando de novo.";
export const ACTION_FAILED_MESSAGE = "Não foi possível concluir agora. Tente de novo.";
export const NO_ENTRIES_NOTE = "A conversa aparece aqui assim que o Claude responder.";

export const MAX_MESSAGE_LENGTH = 20_000;
export const MAX_FREE_TEXT_LENGTH = 2_000;

export const CHOICE_SINGLE_LABEL = "Escolha uma opção";
export const CHOICE_MULTIPLE_LABEL = "Escolha uma ou mais opções";
export const OTHER_LABEL = "Outra";
export const OTHER_TEXT_LABEL = "Sua resposta";
export const SUBMIT_ANSWERS_LABEL = "Enviar respostas";
export const ANSWERED_LABEL = "Respondida";
export const ALLOW_LABEL = "Permitir";
export const DENY_LABEL = "Recusar";
export const DENY_REASON_LABEL = "Motivo da recusa (opcional)";
export const DENY_SEND_LABEL = "Enviar recusa";
export const REASON_LIMIT_MESSAGE = "O motivo pode ter até 2.000 caracteres.";
export const OTHER_LIMIT_MESSAGE = "A resposta pode ter até 2.000 caracteres.";
export const DECISION_LABEL = { allow: "Permitido", allow_always: "Permitido sempre", deny: "Recusado" } as const;

export const COMPOSER_LABEL = "Mensagem para o Claude";
export const SEND_LABEL = "Enviar";
export const SENDING_LABEL = "Enviando…";
export const COMPOSER_HINT = "Ctrl+Enter envia; Enter quebra a linha.";
export const MESSAGE_LIMIT_MESSAGE = "A mensagem precisa ter entre 1 e 20.000 caracteres.";
export const INTERRUPT_LABEL = "Interromper";
export const END_LABEL = "Encerrar";
export const END_CONFIRM_MESSAGE = "Encerrar a sessão? O Claude para, e a conversa fica só para leitura.";
export const END_CONFIRM_LABEL = "Encerrar sessão";
export const END_CANCEL_LABEL = "Cancelar";

export function allowAlwaysLabel(rule: string) {
  return `Permitir sempre (${rule})`;
}

export function hiddenEntriesNote(count: number) {
  return count === 1 ? "1 entrada anterior não exibida" : `${count} entradas anteriores não exibidas`;
}

export function lengthCounter(length: number, limit: number) {
  return `${length.toLocaleString("pt-BR")} / ${limit.toLocaleString("pt-BR")}`;
}
