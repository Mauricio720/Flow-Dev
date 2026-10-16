"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import type { PlanningDecision, TaskFailure } from "../contract";
import type { StageTab } from "../stageTabs";
import type { ReplanOffer } from "../components/ReplanControl";
import { StageTabs } from "../components/StageTabs";
import { SpecStage } from "./SpecStage";
import { useSpecInitial } from "./specInitialContext";
import { UnifiedSpecStage } from "./unified/UnifiedSpecStage";
import type { FlowLoad } from "./unified/unifiedContract";

type Props = { project: Project; taskId: string; decision: PlanningDecision | null; canAct: boolean; onFailure: (failure: TaskFailure) => void; lead?: StageTab; replan?: ReplanOffer | null };

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

const DIRECT_ROUTE = "direct_execution";
const PENDING_LABELS = { spec: "Spec", direct: "Execução direta" };

export function FlowStage(props: Props) {
  const direct = props.decision?.selectedRoute === DIRECT_ROUTE;
  const initial = useSpecInitial().flow ?? { kind: "none" } as const;
  const { flow, refresh } = useResolvedFlow(props.project.id, props.taskId, initial);
  const target = useMemo(() => ({ projectId: props.project.id, taskId: props.taskId }), [props.project.id, props.taskId]);
  if (flow.kind === "ready" && flow.overview.flow === "legacy") return <SpecStage {...props} />;
  if (flow.kind !== "ready") {
    const panel = <section aria-label="Fluxo CompozyOS da tarefa" className="rounded-xl border border-line bg-raised px-5 py-4"><p role="status" className="text-sm text-ink-2">{flow.kind === "failed" ? "Não foi possível identificar o fluxo desta tarefa." : "Carregando o fluxo desta tarefa…"}</p>{flow.kind === "failed" && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={refresh}>Tentar novamente</Button>}</section>;
    return <StageTabs tabs={[...(props.lead ? [props.lead] : []), { id: "spec", label: direct ? PENDING_LABELS.direct : PENDING_LABELS.spec, state: "pending", panel }]} current="spec" canAct={props.canAct} />;
  }
  return <UnifiedSpecStage target={target} initial={flow.overview} canAct={props.canAct} lead={props.lead} direct={direct} replan={props.replan} />;
}
