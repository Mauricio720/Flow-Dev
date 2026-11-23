export const INTERRUPTED_BY_PERSON_NOTE = "Interrompido por você";
export const RESUME_FAILED_NOTE = "Não foi possível retomar a conversa. Abra uma nova sessão.";
export const RESUME_FAILED_REASON = "resume_failed";
const NOTE_TIME_ZONE = "America/Sao_Paulo";

const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: NOTE_TIME_ZONE });

export function interruptedAtNote(at: Date): string {
  return `Sessão interrompida às ${timeFormat.format(at)}. Envie uma mensagem para retomar.`;
}
