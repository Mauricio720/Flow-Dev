"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { FlowTarget } from "./unifiedContract";

export type RunQuestion = Awaited<ReturnType<typeof trpc.taskFlow.questions.query>>[number];
export type QuestionAnswer = { choiceIndex?: number; text?: string };
type Loaded = { runId: string; items: RunQuestion[]; error: string | null };

const POLL_INTERVAL_MS = 3000;
const READ_FAILURE = "Não foi possível consultar as perguntas agora.";
const ANSWER_FAILURE = "A resposta não foi confirmada. Atualize a execução antes de reenviar.";

export function useRunQuestions(target: FlowTarget, runId: string | null, onAnswered: () => Promise<void>) {
  const { projectId, taskId } = target;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  useEffect(() => {
    if (!runId) return;
    let active = true;
    const refresh = () => trpc.taskFlow.questions.query({ projectId, taskId, runId }).then(
      (items) => { if (active) setLoaded({ runId, items, error: null }); },
      () => { if (active) setLoaded((current) => ({ runId, items: current?.runId === runId ? current.items : [], error: READ_FAILURE })); },
    );
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId, taskId, runId]);
  const current = loaded && loaded.runId === runId ? loaded : null;
  const answer = async (question: RunQuestion, response: QuestionAnswer) => {
    if (!runId) return;
    setAnsweringId(question.id);
    try {
      await trpc.taskFlow.answerQuestion.mutate({ projectId, taskId, runId, interactionId: question.id, ...response });
      setLoaded({ runId, items: (current?.items ?? []).filter((item) => item.id !== question.id), error: null });
      void onAnswered();
    } catch {
      setLoaded({ runId, items: current?.items ?? [], error: ANSWER_FAILURE });
    } finally { setAnsweringId((id) => (id === question.id ? null : id)); }
  };
  return { questions: current?.items ?? [], error: current?.error ?? null, answeringId, answer };
}
