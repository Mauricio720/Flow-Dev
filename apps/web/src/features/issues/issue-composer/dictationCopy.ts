import type { DictationPhase } from "./dictationState";

export type DictationFeedback = { text: string; alert: boolean };

const TYPING_REMAINS = "Seu texto continua aqui e você pode digitar.";
const FALLBACK_REASON = `O ditado falhou e nada foi adicionado ao texto. ${TYPING_REMAINS}`;
const BUSY_PROVIDER = "A transcrição está no limite de uso agora. Tente de novo em instantes.";
const UNAVAILABLE_PROVIDER = "A transcrição está indisponível no momento. Você pode continuar digitando.";
const UNREADABLE_AUDIO = "O áudio gravado não pôde ser processado e nada foi adicionado ao texto.";
const TASK_CHANGED = "A tarefa mudou e não aceita ditado agora. Atualize para ver o estado atual.";

const REASON_COPY: Record<string, string> = {
  permission_denied: `O navegador negou o uso do microfone. Libere a permissão deste site para ditar. ${TYPING_REMAINS}`,
  no_microphone: "Nenhum microfone foi encontrado neste dispositivo. Você pode continuar digitando.",
  device_error: `O microfone não pôde ser usado. Verifique o dispositivo e tente de novo. ${TYPING_REMAINS}`,
  capture_unsupported: "Este navegador não oferece gravação de áudio compatível. Você pode continuar digitando.",
  incomplete_capture: `A captura foi interrompida antes de terminar e nada foi transcrito. ${TYPING_REMAINS}`,
  no_speech: "Nenhuma fala foi reconhecida. O texto não foi alterado.",
  capture_limit: "A captura chegou ao limite de tempo e foi encerrada. O que foi reconhecido está no texto para revisão; nada foi enviado.",
  capture_active: "Já existe uma captura ativa na sua conta, talvez em outra aba. Encerre-a para ditar aqui.",
  audio_too_large: "A gravação passou do tamanho aceito e não foi enviada.",
  transcription_capacity: BUSY_PROVIDER,
  provider_rate_limited: BUSY_PROVIDER,
  transcription_timeout: "A transcrição demorou demais e foi encerrada. Nada foi adicionado ao texto.",
  provider_unavailable: UNAVAILABLE_PROVIDER,
  service_unavailable: UNAVAILABLE_PROVIDER,
  invalid_audio: UNREADABLE_AUDIO,
  unsupported_audio_type: UNREADABLE_AUDIO,
  invalid_provider_response: UNREADABLE_AUDIO,
  session_required: "Sua sessão expirou. Entre novamente para ditar.",
  author_required: "Somente a pessoa autora pode ditar nesta tarefa.",
  repository_authorization_needed: "Autorize o repositório no GitHub para ditar nesta tarefa.",
  revision_conflict: TASK_CHANGED,
  operation_active: TASK_CHANGED,
  task_complete: TASK_CHANGED,
};

const PHASE_COPY: Partial<Record<DictationPhase, string>> = {
  permission_pending: "Aguardando a permissão do microfone…",
  listening: "Gravando. Pare para transcrever ou cancele para descartar.",
  processing: "Transcrevendo o áudio…",
  stopped: "Ditado adicionado ao texto. Revise antes de enviar.",
  canceled: "Ditado cancelado. O texto de antes da captura foi restaurado.",
};

export function dictationFeedback(phase: DictationPhase, reason: string | null): DictationFeedback | null {
  if (phase === "failed") return { text: (reason && REASON_COPY[reason]) || FALLBACK_REASON, alert: true };
  if (phase === "stopped" && reason) return { text: REASON_COPY[reason] ?? FALLBACK_REASON, alert: false };
  const text = PHASE_COPY[phase];
  return text ? { text, alert: false } : null;
}
