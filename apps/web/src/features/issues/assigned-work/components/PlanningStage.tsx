"use client";

import { Button } from "@/components/ui/button";
import type { TaskDetail } from "../contract";
import type { PlanningActions as Actions } from "../hooks/usePlanningActions";
import { AWAITING_EXPLANATION, OPERATION_STATE_LABEL, PLANNING_STATUS_LABEL, READER_NOTE, UNKNOWN_PLANNING_NOTICE } from "../planningCopy";
import { currentAction, planningLifecycle } from "../planningModel";
import { reasonMessage } from "../taskCopy";
import { PlanningActions } from "./PlanningActions";
import { PlanningDecisionView } from "./PlanningDecisionView";
import { PlanningStatusCapsule } from "./PlanningStatusCapsule";
import { PlanningTimeline } from "./PlanningTimeline";

type Props = { detail: TaskDetail; actions: Actions | null; onRefresh: () => void };

const ACTIVE_OPERATION_STATES = ["queued", "running"];
const APPROVED_FRAME = "border-2 border-merge";
const OPEN_FRAME = "border border-line";

function OperationNote({ detail }: { detail: TaskDetail }) {
  const { operation, status } = detail.planning;
  if (!operation || status === "review" || status === "approved") return null;
  const failure = operation.state === "failed" ? reasonMessage(operation.reason) : null;
  return (
    <div role="status" className="space-y-1 text-sm">
      <p className="flex items-center gap-2 text-[15px] font-medium text-ink">{ACTIVE_OPERATION_STATES.includes(operation.state) && <span aria-hidden="true" className="node-running size-2 rounded-full bg-ink" />}{OPERATION_STATE_LABEL[operation.state] ?? "Estado da análise desconhecido"}</p>
      {failure && <p className="max-w-[65ch] text-destructive">{failure} A Issue publicada não foi alterada.</p>}
    </div>
  );
}

function AwaitingNote({ detail }: { detail: TaskDetail }) {
  const { status, eligibility } = detail.planning;
  if (status !== "awaiting") return null;
  return (
    <div className="space-y-1 text-sm">
      <p className="max-w-[65ch] text-ink-2">{AWAITING_EXPLANATION}</p>
      {!eligibility.canStart && eligibility.reason && <p role="status" className="max-w-[65ch] text-destructive">{reasonMessage(eligibility.reason)}</p>}
    </div>
  );
}

function StageBody({ detail, actions, onRefresh }: Props) {
  const lifecycle = planningLifecycle(detail.planning);
  const next = currentAction(detail);
  if (lifecycle === "unknown") return <div role="alert" className="space-y-2"><p className="text-sm text-ink-2">{UNKNOWN_PLANNING_NOTICE}</p><Button type="button" variant="outline" size="sm" onClick={onRefresh}>Atualizar</Button></div>;
  return (
    <>
      {next && <p className="text-sm text-ink-2">Próxima ação: {next}.</p>}
      <AwaitingNote detail={detail} />
      <OperationNote detail={detail} />
      {detail.planning.decision && <PlanningDecisionView decision={detail.planning.decision} />}
      {actions ? <PlanningActions detail={detail} actions={actions} /> : <p className="text-sm text-ink-3">{READER_NOTE}</p>}
    </>
  );
}

export function PlanningStage({ detail, actions, onRefresh }: Props) {
  const lifecycle = planningLifecycle(detail.planning);
  if (lifecycle === null) return null;
  const label = lifecycle === "unknown" ? "Estado desconhecido" : PLANNING_STATUS_LABEL[lifecycle];
  return (
    <section aria-label="Planejamento" className={`overflow-hidden rounded-xl bg-raised ${lifecycle === "approved" ? APPROVED_FRAME : OPEN_FRAME}`}>
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
        <h2 className="text-[17px] font-semibold">Planejamento</h2>
        <PlanningStatusCapsule lifecycle={lifecycle} label={label} />
      </header>
      <div className="flex flex-col gap-4 px-5 py-4"><StageBody detail={detail} actions={actions} onRefresh={onRefresh} /></div>
      <footer className="border-t border-line bg-surface px-5 py-4"><PlanningTimeline detail={detail} /></footer>
    </section>
  );
}
