"use client";

import { useCallback, useState } from "react";
import type { Project } from "@/lib/projects/contract";
import type { TaskFailure, WorkSnapshot } from "../contract";
import { usePlanningActions } from "../hooks/usePlanningActions";
import { planningLifecycle } from "../planningModel";
import { withOperatorPermissions } from "../planningPermissions";
import { executionTabState, hasActiveSession, latestSession } from "../executionModel";
import { useTasksTab } from "../hooks/useTasksTab";
import { EXECUTION_TAB_ID, EXECUTION_TAB_LABEL, PLANNING_TAB_ID, PLANNING_TAB_LABEL, SPEC_TAB_ID, TASKS_TAB_ID, planningTabState, type ConversationFocus, type StageTab } from "../stageTabs";
import { ExecutionStage } from "./ExecutionStage";
import { PlanningStage } from "./PlanningStage";
import { StageTabs, type StageFocus } from "./StageTabs";

type InitialTab = { active: boolean; hasSet: boolean; hasSpec: boolean; hasSession: boolean; fallback: string };

function initialTabId({ active, hasSet, hasSpec, hasSession, fallback }: InitialTab) {
  if (active) return EXECUTION_TAB_ID;
  if (hasSet) return TASKS_TAB_ID;
  if (hasSpec) return SPEC_TAB_ID;
  return hasSession ? EXECUTION_TAB_ID : fallback;
}

type Props = { project: Project; snapshot: WorkSnapshot; refresh: () => Promise<void>; onFailure: (failure: TaskFailure) => void };

export function OperatorStages({ project, snapshot, refresh, onFailure }: Props) {
  const operate = snapshot.view.viewerCanOperate && snapshot.view.claim.state === "claimed";
  const detail = operate ? withOperatorPermissions(snapshot.detail) : snapshot.detail;
  const planning = usePlanningActions({ projectId: project.id, task: detail.task, input: { clear: () => undefined }, onAccepted: refresh, onChanged: refresh, onFailure, planning: detail.planning });
  const lifecycle = planningLifecycle(detail.planning);
  const [focus, setFocus] = useState<StageFocus | null>(null);
  const [conversation, setConversation] = useState<ConversationFocus | null>(null);
  const clearConversation = useCallback(() => setConversation(null), []);
  const showExecution = (sessionId: string) => {
    setFocus((current) => ({ id: EXECUTION_TAB_ID, nonce: (current?.nonce ?? 0) + 1 }));
    setConversation((current) => ({ sessionId, nonce: (current?.nonce ?? 0) + 1 }));
  };
  const tasks = useTasksTab({ detail, approved: lifecycle === "approved", reader: !operate, refresh, onConversation: showExecution });
  if (lifecycle === null) return null;
  const lead: StageTab = { id: PLANNING_TAB_ID, label: PLANNING_TAB_LABEL, state: planningTabState(detail.planning, lifecycle), panel: <PlanningStage detail={detail} actions={operate ? planning : null} onRefresh={() => void refresh()} /> };
  const session = latestSession(detail);
  const execution: StageTab[] = session ? [{ id: EXECUTION_TAB_ID, label: EXECUTION_TAB_LABEL, state: executionTabState(session), panel: <ExecutionStage detail={detail} reader={!operate} conversation={conversation} onConversationShown={clearConversation} /> }] : [];
  const current = initialTabId({ active: hasActiveSession(detail), hasSet: tasks.hasSet, hasSpec: tasks.specTab !== null, hasSession: session !== null, fallback: lead.id });
  return <StageTabs tabs={[lead, ...(tasks.specTab ? [tasks.specTab] : []), ...(tasks.tab ? [tasks.tab] : []), ...execution]} current={current} canAct={operate} focus={focus} />;
}
