"use client";

import type { Project } from "@/lib/projects/contract";
import type { TaskFailure, WorkSnapshot } from "../contract";
import { usePlanningActions } from "../hooks/usePlanningActions";
import { planningLifecycle } from "../planningModel";
import { withOperatorPermissions } from "../planningPermissions";
import { useTaskExecution, type TaskExecutionStatus } from "../execution/useTaskExecution";
import { executionStatusCopy } from "../execution/executionCopy";
import { ExecutionStage } from "../execution/ExecutionStage";
import { PLANNING_TAB_ID, PLANNING_TAB_LABEL, planningTabState, type StageTab } from "../stageTabs";
import { PlanningStage } from "./PlanningStage";
import { StageTabs } from "./StageTabs";

type Props = { project: Project; snapshot: WorkSnapshot; refresh: () => Promise<void>; onFailure: (failure: TaskFailure) => void; isAdmin?: boolean };
const EXECUTION_TAB_ID = "execution";
const EXECUTION_TAB_LABEL = "Execução";

function executionRecorded(status: TaskExecutionStatus | null) {
  return Boolean(status?.current || status?.history.length);
}

function executionTabState(status: TaskExecutionStatus | null) {
  const state = status?.current?.state ?? status?.history[0]?.state;
  return state ? executionStatusCopy(state).tabState : "pending";
}

export function OperatorStages({ project, snapshot, refresh, onFailure, isAdmin = false }: Props) {
  const operate = snapshot.view.viewerCanOperate && snapshot.view.claim.state === "claimed";
  const detail = operate ? withOperatorPermissions(snapshot.detail) : snapshot.detail;
  const planning = usePlanningActions({ projectId: project.id, task: detail.task, input: { clear: () => undefined }, onAccepted: refresh, onChanged: refresh, onFailure, planning: detail.planning });
  const execution = useTaskExecution({ projectId: project.id, taskId: detail.task.id });
  const lifecycle = planningLifecycle(detail.planning);
  if (lifecycle === null) return executionRecorded(execution.status) ? <ExecutionStage execution={execution} decision={detail.planning.decision} canOperate={operate} isAdmin={isAdmin} /> : null;
  const lead: StageTab = { id: PLANNING_TAB_ID, label: PLANNING_TAB_LABEL, state: planningTabState(detail.planning, lifecycle), panel: <PlanningStage detail={detail} actions={operate ? planning : null} onRefresh={() => void refresh()} /> };
  const tabs = [lead];
  const hasExecutionStage = lifecycle === "approved" || executionRecorded(execution.status);
  if (hasExecutionStage) tabs.push({ id: EXECUTION_TAB_ID, label: EXECUTION_TAB_LABEL, state: executionTabState(execution.status), panel: <ExecutionStage execution={execution} decision={detail.planning.decision} canOperate={operate} isAdmin={isAdmin} /> });
  const current = hasExecutionStage ? EXECUTION_TAB_ID : lead.id;
  return <StageTabs tabs={tabs} current={current} canAct={operate} />;
}
