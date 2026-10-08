"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { QuestionAnswer, RunQuestion } from "./useRunQuestions";

type Props = { question: RunQuestion; position: string | null; busy: boolean; onAnswer: (answer: QuestionAnswer) => void };
const CHOICE_ROW = "flex cursor-pointer items-start gap-3 rounded-md border border-line bg-raised px-3 py-2.5 text-[15px] leading-6 text-ink has-[:checked]:border-clarify has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-project";

export function QuestionForm({ question, position, busy, onAnswer }: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const written = text.trim();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (choice !== null) onAnswer({ choiceIndex: choice });
    else if (written) onAnswer({ text: written });
  };
  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border-2 border-clarify bg-clarify-wash p-4">
      <fieldset className="space-y-3">
        <legend className="space-y-1">
          <span className="block text-xs font-medium text-clarify-ink">Pergunta do agente{position ? ` · ${position}` : ""}</span>
          <span className="block text-base leading-6 font-semibold whitespace-pre-wrap text-ink">{question.title}</span>
        </legend>
        {question.choices.map((option, index) => (
          <label key={`${index}-${option}`} className={CHOICE_ROW}>
            <input type="radio" name={`question-${question.id}`} checked={choice === index} disabled={busy} onChange={() => { setChoice(index); setText(""); }} className="mt-1 size-4 shrink-0 accent-ink" />{option}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1.5 text-sm font-medium text-ink"><span>{question.choices.length ? "Ou escreva outra resposta" : "Sua resposta"}</span>
        <textarea value={text} disabled={busy} onChange={(event) => { setText(event.target.value); setChoice(null); }} rows={3} maxLength={4000} className="w-full rounded-md border border-input bg-raised px-3 py-2 text-[15px] font-normal text-ink focus-visible:border-project focus-visible:outline-none" />
      </label>
      <Button type="submit" disabled={busy || (choice === null && !written)}>{busy ? "Enviando…" : "Responder e continuar"}</Button>
    </form>
  );
}
