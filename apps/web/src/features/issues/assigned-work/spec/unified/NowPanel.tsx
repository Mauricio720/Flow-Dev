"use client";

import { ACTIVE_RUN_STATES, type FlowStage } from "./flowStages";
import { QuestionList } from "./RunQuestions";
import { RunLive } from "./RunLive";
import { FINISHED_NOW, NOW_COPY, QUESTION_NOW, READER_NOTE, READER_STATE_LABELS, STAGE_LABELS } from "./stageCopy";
import { RetryRuntimeForm } from "./RetryRuntimeForm";
import type { FlowAction, FlowConnection, FlowRun, FlowTarget, MovableWorkspaceKind, RetryRuntimeBindings } from "./unifiedContract";
import { useRunQuestions } from "./useRunQuestions";

export type RetryOffer = { action: FlowAction; connections: FlowConnection[]; workspaceKinds: MovableWorkspaceKind[]; pending: boolean; onRetry: (bindings?: RetryRuntimeBindings, moveTo?: MovableWorkspaceKind) => void };
type Props = { stage: FlowStage; runs: FlowRun[]; target: FlowTarget; canAct: boolean; busy: boolean; retry?: RetryOffer | null; onChanged: () => Promise<void>; onCancel: (runId: string) => void };

function nowCopy(stage: FlowStage, asking: boolean, canAct: boolean) {
  if (!canAct) return { title: `${STAGE_LABELS[stage.key].label}: ${READER_STATE_LABELS[stage.state].toLocaleLowerCase("pt-BR")}`, detail: READER_NOTE };
  if (asking) return QUESTION_NOW;
  return NOW_COPY[stage.key][stage.state] ?? FINISHED_NOW;
}

export function NowPanel({ stage, runs, target, canAct, busy, retry, onChanged, onCancel }: Props) {
  const activeRun = runs.find((run) => ACTIVE_RUN_STATES.includes(run.state)) ?? null;
  const askable = activeRun && activeRun.kind !== "loop" ? activeRun.id : null;
  const questions = useRunQuestions(target, askable, onChanged);
  const copy = nowCopy(stage, questions.questions.length > 0, canAct);
  return (
    <section aria-label="Agora" className="space-y-4">
      <div className="space-y-1.5">
        <h3 className="text-[17px] leading-snug font-semibold text-balance text-ink">{copy.title}</h3>
        <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{copy.detail}</p>
      </div>
      {retry && !activeRun && <RetryRuntimeForm key={retry.action.id} {...retry} busy={busy} />}
      <QuestionList state={questions} canAct={canAct} />
      {activeRun && <RunLive key={activeRun.id} run={activeRun} busy={busy} asking={questions.questions.length > 0} onCancel={canAct ? onCancel : null} />}
    </section>
  );
}
