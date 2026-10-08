"use client";

import type { Project } from "@/lib/projects/contract";
import { StageTabs } from "../components/StageTabs";
import type { PlanningDecision, TaskFailure } from "../contract";
import type { StageTab, StageTabState } from "../stageTabs";
import { SpecHeader } from "./SpecHeader";
import { SpecStageBody } from "./SpecStageBody";
import type { SpecSnapshot } from "./specContract";
import { LOSS_OF_CONTACT, SPEC_REGION_LABEL, SPEC_TITLE } from "./specCopy";
import { useSpecStage } from "./useSpecStage";

type Props = { project: Project; taskId: string; decision: PlanningDecision | null; canAct: boolean; onFailure: (failure: TaskFailure) => void; lead?: StageTab };
const SPEC_TAB_ID = "spec";
const TAB_STATE: Record<string, StageTabState> = {
  not_started: "yours", waiting_question: "yours", waiting_permission: "yours", review: "yours", queued: "current", running: "current",
  finalizing: "current", stopping: "current", failed: "failed", canceled: "failed", approved: "done",
};

function tabState(snapshot: SpecSnapshot | null): StageTabState {
  return (snapshot && TAB_STATE[snapshot.state]) ?? "pending";
}

export function SpecStage({ project, taskId, decision, canAct, onFailure, lead }: Props) {
  const data = useSpecStage({ projectId: project.id, taskId, onFailure });
  const { snapshot, denied, failure } = data.snapshotHook;
  const leading = lead ? [lead] : [];
  if (!snapshot && denied) return <StageTabs tabs={leading} current={lead?.id ?? SPEC_TAB_ID} canAct={canAct} />;
  const panel = snapshot ? (
    <section aria-label={SPEC_REGION_LABEL} className="overflow-hidden rounded-xl border border-line bg-raised">
      <SpecHeader snapshot={snapshot} />
      <SpecStageBody data={data} snapshot={snapshot} decision={decision} canAct={canAct} />
    </section>
  ) : <p role="status" className="px-5 py-3 text-sm text-ink-2">{failure ? LOSS_OF_CONTACT : "Carregando a especificação…"}</p>;
  return <StageTabs tabs={[...leading, { id: SPEC_TAB_ID, label: SPEC_TITLE, state: tabState(snapshot), panel }]} current={SPEC_TAB_ID} canAct={canAct} />;
}
