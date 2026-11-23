import type { Question, QuestionAnswerInput } from "../../terminal/sessionInteraction";
import { MAX_FREE_TEXT_LENGTH } from "./sessionInteractionLimits";

export type AnswerFailure = "answer_incomplete" | "answer_invalid";
export type ValidatedAnswers = Record<string, string | string[]>;
export type QuestionAnswersResult = { ok: true; answers: ValidatedAnswers } | { ok: false; reason: AnswerFailure };

type Entry = QuestionAnswerInput[string];
type QuestionOutcome = { value: string | string[] } | { failure: AnswerFailure };

function otherText(entry: Entry): string | null | undefined {
  if (entry.other === undefined) return null;
  const withinLimits = entry.other.trim().length >= 1 && entry.other.length <= MAX_FREE_TEXT_LENGTH;
  return withinLimits ? entry.other : undefined;
}

function hasUnknownOrRepeatedLabel(question: Question, labels: string[]): boolean {
  const known = new Set(question.options.map((option) => option.label));
  return new Set(labels).size !== labels.length || labels.some((label) => !known.has(label));
}

function resolveQuestion(question: Question, entry: Entry | undefined): QuestionOutcome {
  if (!entry) return { failure: "answer_incomplete" };
  const other = otherText(entry);
  if (other === undefined || hasUnknownOrRepeatedLabel(question, entry.labels)) return { failure: "answer_invalid" };
  const picked = other === null ? entry.labels : [...entry.labels, other];
  if (picked.length === 0) return { failure: "answer_incomplete" };
  if (question.multiSelect) return { value: picked };
  return picked.length === 1 ? { value: picked[0]! } : { failure: "answer_invalid" };
}

export function validateQuestionAnswers(questions: Question[], answers: QuestionAnswerInput): QuestionAnswersResult {
  const asked = new Set(questions.map((question) => question.question));
  if (Object.keys(answers).some((key) => !asked.has(key))) return { ok: false, reason: "answer_invalid" };
  const outcomes = questions.map((question) => resolveQuestion(question, answers[question.question]));
  const failures = outcomes.flatMap((outcome) => ("failure" in outcome ? [outcome.failure] : []));
  if (failures.includes("answer_invalid")) return { ok: false, reason: "answer_invalid" };
  if (failures.length > 0) return { ok: false, reason: "answer_incomplete" };
  const entries = questions.map((question, index) => [question.question, (outcomes[index] as { value: string | string[] }).value]);
  return { ok: true, answers: Object.fromEntries(entries) };
}
