import type { ActiveItem } from "./contract";
import { executionProgressSummary } from "./execution/executionCopy";
import { NOT_PLANNED_HEADLINE, PLANNING_HEADLINE, PLANNING_STAGE_LABEL, READER_WAITING_HEADLINE } from "./progressCopy";
import { READER_TAB_STATE_LABELS, STAGE_TAB_STATE_LABELS, type StageTabState } from "./stageTabs";

export type ProgressSummary = { state: StageTabState; badge: string; headline: string };

const PLANNING_STATE: Record<string, StageTabState> = { awaiting: "yours", in_progress: "current", review: "yours", failed: "failed", approved: "done" };

export function progressSummary(item: ActiveItem, operator: boolean): ProgressSummary {
  if (item.progress.execution) return executionProgressSummary(item.progress.execution.state);
  const state = (item.stage && PLANNING_STATE[item.stage]) || "pending";
  const labels = operator ? STAGE_TAB_STATE_LABELS : READER_TAB_STATE_LABELS;
  const waitingOnOperator = !operator && state === "yours";
  const headline = waitingOnOperator ? READER_WAITING_HEADLINE : (item.stage && PLANNING_HEADLINE[item.stage]) || NOT_PLANNED_HEADLINE;
  return { state, badge: `${PLANNING_STAGE_LABEL} · ${labels[state]}`, headline };
}
