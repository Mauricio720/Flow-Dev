"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import type { PlanningDecision, TaskFailure } from "../contract";
import type { StageTab } from "../stageTabs";
import { StageTabs } from "../components/StageTabs";
import { SpecStage } from "./SpecStage";
import { useSpecInitial } from "./specInitialContext";
import { UnifiedSpecStage } from "./unified/UnifiedSpecStage";
import type { FlowLoad } from "./unified/unifiedContract";

type Props = { project: Project; taskId: string; decision: PlanningDecision | null; canAct: boolean; onFailure: (failure: TaskFailure) => void; lead?: StageTab };

function useResolvedFlow(projectId: string, taskId: string, initial: FlowLoad) {
  const [flow, setFlow] = useState<FlowLoad>(initial);
  const read = useCallback(() => {
    return trpc.taskFlow.byTask.query({ projectId, taskId }).then(
      (overview) => setFlow({ kind: "ready", overview }),
      () => setFlow({ kind: "failed" }),
    );
  }, [projectId, taskId]);
  const refresh = () => { setFlow({ kind: "none" }); void read(); };
  useEffect(() => { if (initial.kind !== "ready") void read(); }, [initial.kind, read]);
  return { flow, refresh };
}

export function FlowStage(props: Props) {
  const initial = useSpecInitial().flow ?? { kind: "none" } as const;
  const { flow, refresh } = useResolvedFlow(props.project.id, props.taskId, initial);
  if (flow.kind === "ready" && flow.overview.flow === "legacy") return <SpecStage {...props} />;
  if (flow.kind !== "ready") {
    const panel = <section aria-label="Fluxo CompozyOS da tarefa" className="rounded-xl border border-line bg-raised px-5 py-4"><p role="status" className="text-sm text-ink-2">{flow.kind === "failed" ? "Não foi possível identificar o fluxo desta tarefa." : "Carregando o fluxo desta tarefa…"}</p>{flow.kind === "failed" && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={refresh}>Tentar novamente</Button>}</section>;
    return <StageTabs tabs={[...(props.lead ? [props.lead] : []), { id: "spec", label: "Spec", state: "pending", panel }]} current="spec" canAct={props.canAct} />;
  }
  return <UnifiedSpecStage target={{ projectId: props.project.id, taskId: props.taskId }} initial={flow.overview} canAct={props.canAct} lead={props.lead} />;
}
