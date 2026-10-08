"use client";

import type { Project } from "@/lib/projects/contract";
import type { TaskFailure, WorkSnapshot } from "../contract";
import { flowVisible } from "../flowVisibility";
import { usePlanningActions } from "../hooks/usePlanningActions";
import { planningLifecycle } from "../planningModel";
import { withOperatorPermissions } from "../planningPermissions";
import { FlowStage } from "../spec/FlowStage";
import { PLANNING_TAB_ID, PLANNING_TAB_LABEL, planningTabState, type StageTab } from "../stageTabs";
import { PlanningStage } from "./PlanningStage";
import { StageTabs } from "./StageTabs";

type Props = { project: Project; snapshot: WorkSnapshot; refresh: () => Promise<void>; onFailure: (failure: TaskFailure) => void };

export function OperatorStages({ project, snapshot, refresh, onFailure }: Props) {
  const operate = snapshot.view.viewerCanOperate && snapshot.view.claim.state === "claimed";
  const detail = operate ? withOperatorPermissions(snapshot.detail) : snapshot.detail;
  const planning = usePlanningActions({ projectId: project.id, task: detail.task, input: { clear: () => undefined }, onAccepted: refresh, onChanged: refresh, onFailure, planning: detail.planning });
  const lifecycle = planningLifecycle(detail.planning);
  if (lifecycle === null) return null;
  const lead: StageTab = { id: PLANNING_TAB_ID, label: PLANNING_TAB_LABEL, state: planningTabState(detail.planning, lifecycle), panel: <PlanningStage detail={detail} actions={operate ? planning : null} onRefresh={() => void refresh()} /> };
  if (!flowVisible(snapshot)) return <StageTabs tabs={[lead]} current={lead.id} canAct={operate} />;
  return <FlowStage project={project} taskId={detail.task.id} decision={detail.planning.decision} canAct={operate} onFailure={onFailure} lead={lead} />;
}
