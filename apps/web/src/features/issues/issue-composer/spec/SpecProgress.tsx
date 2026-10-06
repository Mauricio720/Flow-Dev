"use client";

import { Button } from "@/components/ui/button";
import type { PlanningDecision } from "../contract";
import type { SpecSnapshot, SpecStageName } from "./specContract";
import { UNKNOWN_SPEC_NOTICE } from "./specCopy";
import { STAGE_LABEL, STATE_LABEL, requiredStages, specLifecycle, stageNote, stageState } from "./specStageModel";

type Props = { snapshot: SpecSnapshot; decision: PlanningDecision | null; canAct: boolean; onCancel: (attemptId: string) => void; onSelectStage: (stage: SpecStageName) => void; onRefresh: () => void };
const CANCELABLE = ["queued", "dispatching", "running", "waiting", "finalizing"];

function Rationale({ decision, route }: { decision: PlanningDecision; route: string | null }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-ink-2">Rota selecionada: <strong>{route === "prd" ? "PRD" : route === "tech_spec" ? "Tech Spec" : "Execução direta"}</strong> · racional completo</summary>
      <div className="mt-2 space-y-2 text-ink-2"><p className="whitespace-pre-wrap">{decision.summary}</p><ul className="list-disc pl-5">{decision.reasons.map((reason) => <li key={reason} className="whitespace-pre-wrap">{reason}</li>)}</ul></div>
    </details>
  );
}

export function SpecProgress({ snapshot, decision, canAct, onCancel, onSelectStage, onRefresh }: Props) {
  if (specLifecycle(snapshot) === "unknown") return <div role="alert" className="space-y-2"><p className="text-sm text-ink-2">{UNKNOWN_SPEC_NOTICE}</p><Button type="button" variant="outline" size="sm" onClick={onRefresh}>Atualizar</Button></div>;
  const attempt = snapshot.attempt;
  return (
    <div className="space-y-3">
      {decision && <Rationale decision={decision} route={snapshot.route} />}
      <ol aria-label="Etapas obrigatórias" className="flex flex-wrap gap-2">
        {requiredStages(snapshot.route).map((stage) => (
          <li key={stage}><button type="button" onClick={() => onSelectStage(stage)} className="rounded-md border border-line px-3 py-1.5 text-sm"><span className="font-medium">{STAGE_LABEL[stage]}</span> · {STATE_LABEL[stageState(snapshot, stage)] ?? "Estado desconhecido"}</button></li>
        ))}
      </ol>
      {snapshot.route === "tech_spec" && <p className="text-sm text-ink-3">{stageNote(snapshot, "prd")}</p>}
      {canAct && attempt && CANCELABLE.includes(attempt.state) && <Button type="button" variant="outline" size="sm" onClick={() => onCancel(attempt.id)}>{`Cancelar execução ${attempt.attemptNumber}`}</Button>}
    </div>
  );
}
