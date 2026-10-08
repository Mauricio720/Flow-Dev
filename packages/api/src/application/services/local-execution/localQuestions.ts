export const QUESTION_STATES = ["pending", "resolved"] as const;
export const QUESTION_CHOICES_MAX = 12;
export const QUESTION_FALLBACK_TITLE = "O agente precisa de uma resposta";

export type QuestionState = (typeof QUESTION_STATES)[number];
export type QuestionReport = { interactionId: string; status: QuestionState; title: string; choices: string[] };
export type RunQuestion = { id: string; title: string; choices: string[] };

type ReportedEvent = { kind: string; payload: Record<string, unknown> };

const QUESTION_EVENT = "question";
const TERMINAL_EVENT = "terminal";

// The connector reports a question when it appears and again when it is answered, so the last report wins.
// A finished run has nobody left to read an answer, so it asks nothing.
export function pendingQuestions(events: ReportedEvent[]): RunQuestion[] {
  if (events.some((event) => event.kind === TERMINAL_EVENT)) return [];
  const latest = new Map<string, QuestionReport>();
  for (const event of events) {
    if (event.kind !== QUESTION_EVENT) continue;
    const report = event.payload as QuestionReport;
    latest.set(report.interactionId, report);
  }
  return [...latest.values()].filter((report) => report.status === "pending").map(({ interactionId, title, choices }) => ({ id: interactionId, title, choices }));
}
