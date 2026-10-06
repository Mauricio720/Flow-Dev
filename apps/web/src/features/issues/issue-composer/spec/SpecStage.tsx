"use client";

import type { Project } from "@/lib/projects/contract";
import { GraphRow } from "../components/Graph";
import type { PlanningDecision, TaskFailure } from "../contract";
import { SpecHeader } from "./SpecHeader";
import { SpecStageBody } from "./SpecStageBody";
import { LOSS_OF_CONTACT, SPEC_REGION_LABEL } from "./specCopy";
import { useSpecStage } from "./useSpecStage";

type Props = { project: Project; taskId: string; decision: PlanningDecision | null; canAct: boolean; onFailure: (failure: TaskFailure) => void };
const HEADER_CENTER_Y = 26;

export function SpecStage({ project, taskId, decision, canAct, onFailure }: Props) {
  const data = useSpecStage({ projectId: project.id, taskId, onFailure });
  const { snapshot, denied, failure } = data.snapshotHook;
  if (!snapshot) return denied ? null : <li><p role="status" className="px-5 py-3 text-sm text-ink-2">{failure ? LOSS_OF_CONTACT : "Carregando a especificação…"}</p></li>;
  return (
    <li data-anchor="spec">
      <GraphRow node="head" nodeY={HEADER_CENTER_Y} className="pb-7">
        <section aria-label={SPEC_REGION_LABEL} className="overflow-hidden rounded-xl border border-line bg-raised">
          <SpecHeader snapshot={snapshot} />
          <SpecStageBody data={data} snapshot={snapshot} decision={decision} canAct={canAct} />
        </section>
      </GraphRow>
    </li>
  );
}
