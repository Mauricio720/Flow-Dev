"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { isComplete, toAnswers, type AnswerState } from "../questionAnswerModel";
import type { ActionResult, QuestionAnswers, QuestionEntry } from "../sessionContract";
import { SUBMIT_ANSWERS_LABEL } from "../sessionCopy";
import { QuestionField } from "./QuestionField";
import { QuestionSummary } from "./QuestionSummary";

type Props = { entry: QuestionEntry; canAnswer: boolean; busy: boolean; onAnswer: (requestId: string, answers: QuestionAnswers) => Promise<ActionResult> };

const FRAME = "space-y-3 rounded-xl border-2 border-clarify/40 bg-raised p-4";

export function QuestionRequestCard({ entry, canAnswer, busy, onAnswer }: Props) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [failure, setFailure] = useState<string | null>(null);
  if (entry.status !== "pending" || !canAnswer) return <section aria-label="Pergunta do Claude" className={FRAME}><QuestionSummary entry={entry} /></section>;
  async function submit() {
    setFailure(null);
    setFailure(await onAnswer(entry.id, toAnswers(entry.questions, answers)));
  }
  return (
    <section aria-label="Pergunta do Claude" className={FRAME}>
      {entry.questions.map((question) => (
        <QuestionField key={question.question} question={question} value={answers[question.question]} disabled={busy} onChange={(next) => setAnswers((current) => ({ ...current, [question.question]: next }))} />
      ))}
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <Button type="button" disabled={busy || !isComplete(entry.questions, answers)} onClick={() => void submit()}>{SUBMIT_ANSWERS_LABEL}</Button>
    </section>
  );
}
