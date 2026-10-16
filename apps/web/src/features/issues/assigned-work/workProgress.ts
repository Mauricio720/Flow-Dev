import type { ActiveItem } from "./contract";
import { FLOW_DONE_LABEL, LEGACY_HEADLINE, NOT_PLANNED_HEADLINE, PLANNING_HEADLINE, READER_WAITING_HEADLINE, PLANNING_STAGE_LABEL, PLANNING_STAGE_STATE, REVIEWING_LABEL } from "./progressCopy";
import { currentStageIndex, flowStages, type StageState } from "./spec/unified/flowStages";
import { flowTabsFor, tabOfStage, tabStage } from "./spec/unified/flowTabs";
import { FINISHED_NOW, NOW_COPY, READER_STATE_LABELS, STAGE_LABELS, STAGE_STATE_LABELS } from "./spec/unified/stageCopy";

export type ProgressStage = { key: string; label: string; state: StageState };
export type LiveRun = NonNullable<ActiveItem["progress"]["activeRun"]>;
export type ProgressSummary = { rail: ProgressStage[]; state: StageState; badge: string; headline: string; run: LiveRun | null };

const DIRECT_ROUTE = "direct_execution";
const APPROVED_PLANNING = "approved";
const LEGACY_FLOW = "legacy";
const REVIEW_STAGES = ["spec_review", "tasks_review"];

function planningStage(status: string | null): ProgressStage {
  return { key: "planning", label: PLANNING_STAGE_LABEL, state: status ? PLANNING_STAGE_STATE[status] ?? "pending" : "pending" };
}

function badgeOf(label: string, state: StageState, operator: boolean) {
  const labels = operator ? STAGE_STATE_LABELS : READER_STATE_LABELS;
  return `${label} · ${labels[state]}`;
}

function readerHeadline(state: StageState, operator: boolean) {
  return !operator && state === "yours" ? READER_WAITING_HEADLINE : null;
}

function pendingRail(planning: ProgressStage, direct: boolean): ProgressStage[] {
  return [planning, ...flowTabsFor(direct).map((tab) => ({ key: tab.key, label: tab.label, state: "pending" as const }))];
}

function planningSummary(item: ActiveItem, rail: ProgressStage[], operator: boolean): ProgressSummary {
  const planning = rail[0]!;
  const headline = item.stage ? PLANNING_HEADLINE[item.stage] ?? NOT_PLANNED_HEADLINE : NOT_PLANNED_HEADLINE;
  return { rail, state: planning.state, badge: badgeOf(planning.label, planning.state, operator), headline: readerHeadline(planning.state, operator) ?? headline, run: null };
}

function flowSummary(item: ActiveItem, planning: ProgressStage, operator: boolean): ProgressSummary {
  const { progress } = item;
  const direct = progress.route === DIRECT_ROUTE;
  const stages = flowStages({ plan: { actions: progress.actions }, packages: progress.packages }, direct);
  const rail = [planning, ...flowTabsFor(direct).map((tab) => ({ key: tab.key, label: tab.label, state: tabStage(tab, stages).state }))];
  const finished = stages.every((stage) => stage.state === "done");
  const turn = stages[currentStageIndex(stages)]!;
  const label = tabOfStage(turn.key).label;
  const reviewing = turn.state === "yours" && REVIEW_STAGES.includes(turn.key);
  const badge = finished ? FLOW_DONE_LABEL : reviewing ? `${label} · ${REVIEWING_LABEL}` : badgeOf(label, turn.state, operator);
  const copy = finished ? FINISHED_NOW : NOW_COPY[turn.key][turn.state];
  const headline = readerHeadline(turn.state, operator) ?? copy?.title ?? STAGE_LABELS[turn.key].actor;
  return { rail, state: finished ? "done" : turn.state, badge, headline, run: progress.activeRun };
}

export function progressSummary(item: ActiveItem, operator: boolean): ProgressSummary {
  const planning = planningStage(item.stage);
  if (item.stage !== APPROVED_PLANNING) return planningSummary(item, pendingRail(planning, item.progress.route === DIRECT_ROUTE), operator);
  if (item.progress.flow === LEGACY_FLOW) return { rail: [planning], state: "done", badge: badgeOf(planning.label, "done", operator), headline: LEGACY_HEADLINE, run: item.progress.activeRun };
  return flowSummary(item, planning, operator);
}
