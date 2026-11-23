import type { QuestionAnswers, QuestionItem } from "./sessionContract";
import { MAX_FREE_TEXT_LENGTH } from "./sessionCopy";

export type QuestionState = { labels: string[]; other: boolean; text: string };
export type AnswerState = Record<string, QuestionState>;

export const EMPTY_QUESTION: QuestionState = { labels: [], other: false, text: "" };

export function pickOption(question: QuestionItem, state: QuestionState, label: string): QuestionState {
  if (!question.multiSelect) return { ...state, labels: [label], other: false };
  const labels = state.labels.includes(label) ? state.labels.filter((item) => item !== label) : [...state.labels, label];
  return { ...state, labels };
}

export function pickOther(question: QuestionItem, state: QuestionState): QuestionState {
  if (!question.multiSelect) return { ...state, labels: [], other: true };
  return { ...state, other: !state.other };
}

export const otherTooLong = (state: QuestionState) => state.other && state.text.length > MAX_FREE_TEXT_LENGTH;

export function isAnswered(state: QuestionState): boolean {
  const otherFilled = state.other && state.text.trim().length > 0 && !otherTooLong(state);
  return state.labels.length > 0 || otherFilled;
}

export function isComplete(questions: QuestionItem[], answers: AnswerState): boolean {
  return questions.every((question) => isAnswered(answers[question.question] ?? EMPTY_QUESTION)) && questions.every((question) => !otherTooLong(answers[question.question] ?? EMPTY_QUESTION));
}

export function toAnswers(questions: QuestionItem[], answers: AnswerState): QuestionAnswers {
  const entries = questions.map((question) => {
    const state = answers[question.question] ?? EMPTY_QUESTION;
    return [question.question, state.other ? { labels: state.labels, other: state.text } : { labels: state.labels }] as const;
  });
  return Object.fromEntries(entries);
}
