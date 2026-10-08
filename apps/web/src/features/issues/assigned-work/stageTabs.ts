import type { ReactNode } from "react";
import type { PlanningDetail } from "./contract";
import type { PlanningLifecycle, TimelineState } from "./planningModel";

export type StageTabState = TimelineState | "yours";
export type StageTab = { id: string; label: string; state: StageTabState; panel: ReactNode };

export const PLANNING_TAB_ID = "planning";
export const PLANNING_TAB_LABEL = "Planejamento";
export const STAGE_TAB_STATE_LABELS: Record<StageTabState, string> = { done: "Concluída", current: "Em andamento", failed: "Falhou", pending: "Pendente", yours: "Aguardando você" };
export const READER_TAB_STATE_LABELS: Record<StageTabState, string> = { ...STAGE_TAB_STATE_LABELS, yours: "Aguardando a pessoa operadora" };

const PLANNING_TAB_STATE: Record<PlanningLifecycle, StageTabState> = { awaiting: "yours", in_progress: "current", review: "yours", failed: "failed", approved: "done", unknown: "pending" };

export function planningTabState(planning: PlanningDetail, lifecycle: PlanningLifecycle): StageTabState {
  if (lifecycle === "awaiting" && !planning.eligibility.canStart) return "pending";
  return PLANNING_TAB_STATE[lifecycle];
}
