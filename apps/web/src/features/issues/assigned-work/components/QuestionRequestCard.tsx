"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { isComplete, questionKey, toAnswers, type AnswerState } from "../questionAnswerModel";
import type { ActionResult, QuestionAnswers, QuestionEntry } from "../sessionContract";
import { questionLabelFor, SUBMIT_ANSWERS_LABEL } from "../sessionCopy";
import { QuestionField } from "./QuestionField";
import { QuestionSummary } from "./QuestionSummary";

type Props = { entry: QuestionEntry; agent?: string; canAnswer: boolean; busy: boolean; onAnswer: (requestId: string, answers: QuestionAnswers) => Promise<ActionResult> };

const FRAME = "space-y-3 rounded-xl border-2 border-clarify/40 bg-raised p-4";

function QuestionResponseForm({ entry, busy, onAnswer }: Pick<Props, "entry" | "busy" | "onAnswer">) {
  const id = useId();
  const [answers, setAnswers] = useState<AnswerState>({});
  const [failure, setFailure] = useState<string | null>(null);
  async function submit() {
    setFailure(null);
    const result = await onAnswer(entry.id, toAnswers(entry.questions, answers));
    setFailure(result);
    if (!result) setAnswers({});
  }
  return (
    <>
      {entry.questions.map((question, index) => (
        <QuestionField key={`${questionKey(question)}-${index}`} id={`${id}-${index}`} question={question} value={answers[questionKey(question)]} disabled={busy} onChange={(next) => setAnswers((current) => ({ ...current, [questionKey(question)]: next }))} />
      ))}
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <Button type="button" disabled={busy || !isComplete(entry.questions, answers)} onClick={() => void submit()}>{SUBMIT_ANSWERS_LABEL}</Button>
    </>
  );
}

export function QuestionRequestCard({ entry, agent = "claude", canAnswer, busy, onAnswer }: Props) {
  const label = questionLabelFor(agent);
  if (entry.status !== "pending" || !canAnswer) return <section aria-label={label} className={FRAME}><QuestionSummary entry={entry} /></section>;
  return <section aria-label={label} className={FRAME}><QuestionResponseForm entry={entry} busy={busy} onAnswer={onAnswer} /></section>;
}
