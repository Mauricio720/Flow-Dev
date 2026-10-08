import { SPEC_FORMAT, TASKS_FORMAT, type FlowStage, type StageKey } from "./flowStages";
import { isReviewStep, type FlowStep } from "./loopNames";
import type { DraftAction } from "./unifiedContract";

export type FlowTab = { key: string; label: string; stages: StageKey[]; actionKind: string; review: boolean; format: string | null; waitingNote: string };

export const FLOW_TABS: FlowTab[] = [
  { key: "spec", label: "Spec", stages: ["spec", "spec_review"], actionKind: "create_spec", review: false, format: SPEC_FORMAT, waitingNote: "Esta etapa começa depois que o planejamento for aprovado." },
  { key: "tasks", label: "Tarefas", stages: ["tasks", "tasks_review"], actionKind: "create_tasks", review: false, format: TASKS_FORMAT, waitingNote: "Esta etapa começa depois que a spec for aprovada." },
  { key: "execution", label: "Implementação", stages: ["execution"], actionKind: "loop", review: false, format: null, waitingNote: "Esta etapa começa depois que as tarefas forem aprovadas." },
  { key: "review", label: "Review", stages: ["review"], actionKind: "loop", review: true, format: null, waitingNote: "Esta etapa começa depois que a implementação das tarefas terminar." },
];

export function ownsStep(tab: FlowTab, step: FlowStep) {
  return step.kind === tab.actionKind && isReviewStep(step) === tab.review;
}

export function ownsDraft(tab: FlowTab, action: DraftAction) {
  return ownsStep(tab, { kind: action.kind, loopName: action.loop?.name ?? null });
}

export function tabStage(tab: FlowTab, stages: FlowStage[]): FlowStage {
  const own = stages.filter((stage) => tab.stages.includes(stage.key));
  return own.find((stage) => stage.state !== "done") ?? own.at(-1)!;
}

export function tabOfStage(key: StageKey): FlowTab {
  return FLOW_TABS.find((tab) => tab.stages.includes(key))!;
}
