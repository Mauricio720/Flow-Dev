"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { TaskDetail } from "../contract";
import type { PlanningActions as Actions } from "../hooks/usePlanningActions";
import { CONFLICT_NOTICE, START_ACTION_LABEL, UNCERTAIN_NOTICE } from "../planningCopy";
import { reasonMessage } from "../taskCopy";
import { PlanningRouteSelector } from "./PlanningRouteSelector";

type Props = { detail: TaskDetail; actions: Actions };

function CommandNotice({ actions }: { actions: Actions }) {
  const { phase, failure } = actions.command;
  if (phase === "conflict") return <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{CONFLICT_NOTICE}</p><Button type="button" variant="outline" size="sm" onClick={actions.reviewed}>Revisar a rota salva</Button></div>;
  if (phase === "uncertain" || phase === "resend") return <div role="status" className="space-y-2"><p className="text-sm text-ink-2">{UNCERTAIN_NOTICE}</p><Button type="button" variant="outline" size="sm" onClick={phase === "resend" ? actions.resend : () => void actions.reconcile()}>{phase === "resend" ? "Reenviar a mesma ação" : "Verificar envio"}</Button></div>;
  if (phase === "rejected" && failure) return <p role="alert" className="text-sm text-destructive">{reasonMessage(failure.reason)}</p>;
  return null;
}

function ReviewControls({ detail, actions }: Props) {
  const [choosing, setChoosing] = useState(false);
  const decision = detail.planning.decision;
  const busy = actions.command.phase === "sending";
  if (!decision) return null;
  if (choosing) return <PlanningRouteSelector saved={decision.selectedRoute} busy={busy} onChoose={actions.setDraftRoute} onSave={(route) => { void actions.saveRoute(route); setChoosing(false); }} onCancel={() => { actions.setDraftRoute(null); setChoosing(false); }} />;
  const blocked = busy || actions.dirty || actions.approvalBlocked || !detail.planning.permissions.canApprove;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy || !detail.planning.permissions.canSelectRoute} onClick={() => setChoosing(true)}>Alterar rota</Button>
      <Button type="button" variant="publish" size="sm" disabled={blocked} onClick={() => void actions.approve()}>Aprovar planejamento</Button>
    </div>
  );
}

export function PlanningActions({ detail, actions }: Props) {
  const { planning } = detail;
  const busy = actions.command.phase === "sending";
  return (
    <div className="space-y-3 empty:hidden">
      <CommandNotice actions={actions} />
      {planning.status === "awaiting" && <Button type="button" size="sm" disabled={busy || !planning.permissions.canStart} onClick={() => void actions.start()}>{START_ACTION_LABEL}</Button>}
      {planning.status === "failed" && planning.operation && <Button type="button" size="sm" disabled={busy || !planning.permissions.canRetry} onClick={() => void actions.retry(planning.operation!.id)}>Tentar novamente</Button>}
      {planning.status === "review" && <ReviewControls detail={detail} actions={actions} />}
    </div>
  );
}
