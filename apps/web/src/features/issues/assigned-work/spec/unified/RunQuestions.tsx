"use client";

import { QuestionForm } from "./QuestionForm";
import type { FlowTarget } from "./unifiedContract";
import { useRunQuestions } from "./useRunQuestions";

type State = ReturnType<typeof useRunQuestions>;
type Props = { target: FlowTarget; runId: string; canAct: boolean; onAnswered: () => Promise<void> };

export function QuestionList({ state, canAct }: { state: State; canAct: boolean }) {
  const { questions, error, answeringId, answer } = state;
  if (questions.length === 0 && !error) return null;
  return (
    <div className="space-y-3" role="group" aria-label="Perguntas do agente">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {questions.map((question, index) => canAct
        ? <QuestionForm key={question.id} question={question} position={questions.length > 1 ? `${index + 1} de ${questions.length}` : null} busy={answeringId === question.id} onAnswer={(response) => void answer(question, response)} />
        : <p key={question.id} className="rounded-lg border-2 border-clarify bg-clarify-wash p-4 text-sm leading-6 text-ink">Aguardando a pessoa operadora: {question.title}</p>)}
    </div>
  );
}

export function RunQuestions({ target, runId, canAct, onAnswered }: Props) {
  return <QuestionList state={useRunQuestions(target, runId, onAnswered)} canAct={canAct} />;
}
