import type { ReactNode } from "react";
import type { PlanningDetail } from "./contract";
import type { PlanningLifecycle, TimelineState } from "./planningModel";
import type { TaskSetView } from "./taskSetContract";
import { allTasksCompleted, isSetReadable } from "./taskSetModel";

export type StageTabState = TimelineState | "yours";
export type StageTab = { id: string; label: string; state: StageTabState; panel: ReactNode };

export const PLANNING_TAB_ID = "planning";
export const PLANNING_TAB_LABEL = "Planejamento";
export const SPEC_TAB_ID = "spec";
export const SPEC_TAB_LABEL = "Spec";
export const TASKS_TAB_ID = "tasks";
export const TASKS_TAB_LABEL = "Tarefas";
export const REVIEW_TAB_ID = "review";
export const REVIEW_TAB_LABEL = "Revisão";
export const EXECUTION_TAB_ID = "execution";
export const EXECUTION_TAB_LABEL = "Execução no terminal";
export const STAGE_TAB_STATE_LABELS: Record<StageTabState, string> = { done: "Concluída", current: "Em andamento", failed: "Falhou", pending: "Pendente", yours: "Aguardando você" };
export const READER_TAB_STATE_LABELS: Record<StageTabState, string> = { ...STAGE_TAB_STATE_LABELS, yours: "Aguardando a pessoa operadora" };

const PLANNING_TAB_STATE: Record<PlanningLifecycle, StageTabState> = { awaiting: "yours", in_progress: "current", review: "yours", failed: "failed", approved: "done", unknown: "pending" };

export function planningTabState(planning: PlanningDetail, lifecycle: PlanningLifecycle): StageTabState {
  if (lifecycle === "awaiting" && !planning.eligibility.canStart) return "pending";
  return PLANNING_TAB_STATE[lifecycle];
}

export function tasksTabState(view: TaskSetView): StageTabState {
  if (view.set === null) return "pending";
  return isSetReadable(view.set) && allTasksCompleted(view.set) ? "done" : "current";
}

export type ConversationFocus = { sessionId: string; nonce: number };
