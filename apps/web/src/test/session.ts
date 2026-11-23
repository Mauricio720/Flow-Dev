import type { EventEntry, MessageEntry, PermissionEntry, QuestionEntry, QuestionItem, SessionScope, SessionTimeline } from "@/features/issues/assigned-work/sessionContract";

export const SESSION_SCOPE: SessionScope = { projectId: "00000000-0000-4000-8000-0000000000b1", taskId: "00000000-0000-4000-8000-0000000000c1", sessionId: "00000000-0000-4000-8000-0000000000e1" };
export const AT = "2026-11-23T14:30:00.000Z";

export const VISIBILITY_QUESTION: QuestionItem = {
  question: "Quem pode ver os comentários?",
  header: "Visibilidade",
  multiSelect: false,
  options: [{ label: "Só membros (Recomendado)", description: "Apenas quem é do projeto" }, { label: "Qualquer pessoa", description: "Também visitantes" }],
};

export const CHECKS_QUESTION: QuestionItem = {
  question: "Quais verificações rodar?",
  header: "Verificações",
  multiSelect: true,
  options: [{ label: "lint", description: "ESLint" }, { label: "test", description: "Vitest" }],
};

export function timelineOf(patch: Partial<SessionTimeline> = {}): SessionTimeline {
  return { status: "running", canControl: true, hiddenEntries: 0, cursor: "cursor-1", pending: { requestIds: [] }, entries: [], ...patch };
}

export function messageOf(patch: Partial<MessageEntry> = {}): MessageEntry {
  return { type: "message", id: "m1", role: "assistant", content: "Vou começar pela análise.", truncated: false, queued: false, undelivered: false, at: AT, ...patch };
}

export function eventEntryOf(patch: Partial<EventEntry> = {}): EventEntry {
  return { type: "event", id: "ev1", kind: "command", summary: "pnpm test", at: AT, ...patch };
}

export function questionOf(patch: Partial<QuestionEntry> = {}): QuestionEntry {
  return { type: "question", id: "q1", status: "pending", questions: [VISIBILITY_QUESTION], at: AT, ...patch };
}

export function permissionOf(patch: Partial<PermissionEntry> = {}): PermissionEntry {
  return { type: "permission", id: "p1", status: "pending", tool: "Bash", display: { title: "Rodar comando:", body: "pnpm test" }, suggestedRule: "Bash(pnpm test:*)", at: AT, ...patch };
}
