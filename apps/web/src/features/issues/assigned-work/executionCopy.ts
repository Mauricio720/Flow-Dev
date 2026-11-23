import type { TerminalEventKind, TerminalSessionStatus } from "./executionContract";

export const EXECUTION_STAGE_LABEL = "Sessão do Claude";
export const EXECUTION_TIMELINE_ACTOR = "Sessão do Claude";
export const SESSION_STATUS_LABEL: Record<TerminalSessionStatus, string> = { opening: "Abrindo", running: "Em andamento", waiting: "Aguardando você", asking: "Precisa de você", interrupted: "Interrompida", unconfirmed: "Não confirmada", ended: "Encerrada", launch_failed: "Falhou ao abrir" };
export const UNCONFIRMED_MESSAGE = "Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal.";
export const READER_WAITING_LABEL = "Aguardando a pessoa operadora";
export const SILENT_SINCE_PREFIX = "Sem sinal desde";
export const NO_EVENTS_NOTE = "Nenhum evento registrado ainda.";
export const EVENTS_LIST_LABEL = "Eventos da sessão";
export const HISTORY_LIST_LABEL = "Sessões anteriores";
export const ATTACHMENTS_LIST_LABEL = "Anexos da sessão";
export const REMOVED_ATTACHMENT_LABEL = "removido";
export const NO_ATTACHMENTS_NOTE = "Nenhum anexo nesta sessão.";

export function availableUntilLabel(date: string) {
  return `disponível até ${date}`;
}

export const EVENT_LABEL: Record<TerminalEventKind, (summary: string) => string> = {
  started: () => "Sessão iniciada",
  prompt: (summary) => `Prompt: ${summary}`,
  skill: (summary) => `Skill: ${summary}`,
  file_edit: (summary) => `Editou ${summary}`,
  command: (summary) => `Rodou: ${summary}`,
  waiting: () => SESSION_STATUS_LABEL.waiting,
  attention: (summary) => `Pediu atenção: ${summary}`,
  ended: (summary) => (summary ? `Encerrada: ${summary}` : SESSION_STATUS_LABEL.ended),
};

export function hiddenEventsNote(count: number) {
  return count === 1 ? "1 evento anterior não exibido" : `${count} eventos anteriores não exibidos`;
}

export function droppedEventsNote(count: number) {
  return count === 1 ? "1 evento não registrado" : `${count} eventos não registrados`;
}
