export type DictationPhase = "idle" | "permission_pending" | "listening" | "processing" | "stopped" | "canceled" | "failed";
export type DictationState = { text: string; phase: DictationPhase; captureId: string | null; snapshot: string | null; reason: string | null };
export type DictationEvent =
  | { type: "typed"; text: string }
  | { type: "sent"; text: string }
  | { type: "requested"; captureId: string }
  | { type: "listening"; captureId: string }
  | { type: "stopping"; captureId: string; reason: string | null }
  | { type: "transcribed"; captureId: string; text: string }
  | { type: "canceled"; captureId: string }
  | { type: "failed"; captureId: string; reason: string };

export const NO_SPEECH_REASON = "no_speech";
export const INITIAL_DICTATION: DictationState = { text: "", phase: "idle", captureId: null, snapshot: null, reason: null };
const BUSY_PHASES: DictationPhase[] = ["permission_pending", "listening", "processing"];

export function isCapturing(phase: DictationPhase) {
  return BUSY_PHASES.includes(phase);
}

export function joinSpeech(text: string, speech: string) {
  const typed = text.trimEnd();
  return typed ? `${typed} ${speech.trim()}` : speech.trim();
}

function settle(state: DictationState, patch: Partial<DictationState>): DictationState {
  return { ...state, captureId: null, snapshot: null, ...patch };
}

function transcribed(state: DictationState, speech: string): DictationState {
  if (state.phase !== "processing") return state;
  if (!speech.trim()) return settle(state, { phase: "stopped", reason: NO_SPEECH_REASON });
  return settle(state, { phase: "stopped", text: joinSpeech(state.text, speech) });
}

function captureEvent(state: DictationState, event: Exclude<DictationEvent, { type: "typed" | "sent" | "requested" }>): DictationState {
  if (event.captureId !== state.captureId) return state;
  if (event.type === "listening") return state.phase === "permission_pending" ? { ...state, phase: "listening" } : state;
  if (event.type === "stopping") return state.phase === "listening" ? { ...state, phase: "processing", reason: event.reason } : state;
  if (event.type === "transcribed") return transcribed(state, event.text);
  if (event.type === "canceled") return settle(state, { phase: "canceled", text: state.snapshot ?? state.text, reason: null });
  return settle(state, { phase: "failed", reason: event.reason });
}

export function dictationReducer(state: DictationState, event: DictationEvent): DictationState {
  if (event.type === "typed") return { ...state, text: event.text };
  if (event.type === "sent") return state.text.trim() === event.text.trim() ? { ...state, text: "" } : state;
  if (event.type !== "requested") return captureEvent(state, event);
  if (isCapturing(state.phase)) return state;
  return { ...state, phase: "permission_pending", captureId: event.captureId, snapshot: state.text, reason: null };
}
