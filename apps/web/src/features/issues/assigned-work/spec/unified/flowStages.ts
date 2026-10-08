import type { TimelineState } from "../../planningModel";
import { isReviewStep } from "./loopNames";
import type { FlowAction, FlowOverview, FlowPackage } from "./unifiedContract";

export type StageKey = "spec" | "spec_review" | "tasks" | "tasks_review" | "execution" | "review";
export type StageState = TimelineState | "yours";
export type FlowStage = { key: StageKey; state: StageState };

export const ACTIVE_RUN_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
export const FAILED_RUN_STATES = ["failed", "canceled", "blocked", "stalled", "exhausted"];
export const SPEC_FORMAT = "os_spec_v1";
export const TASKS_FORMAT = "os_tasks_v1";
const SUCCEEDED_STATE = "succeeded";

export function latestPackage(packages: FlowPackage[], format: string) {
  return packages.filter((item) => item.format === format).sort((left, right) => right.version - left.version)[0] ?? null;
}

export function isApproved(item: FlowPackage) {
  return item.approvedAt !== null || item.status === "approved";
}

function actionsOf(overview: FlowOverview | null, kind: string): FlowAction[] {
  return overview?.plan?.actions.filter((action) => action.kind === kind) ?? [];
}

function generationState(action: FlowAction | null, produced: boolean): StageState {
  if (action && ACTIVE_RUN_STATES.includes(action.state)) return "current";
  if (produced) return "done";
  if (action && FAILED_RUN_STATES.includes(action.state)) return "failed";
  return "pending";
}

function reviewState(item: FlowPackage | null): StageState {
  if (!item) return "pending";
  return isApproved(item) ? "done" : "yours";
}

function executionState(loops: FlowAction[]): StageState {
  if (loops.some((loop) => ACTIVE_RUN_STATES.includes(loop.state))) return "current";
  if (loops.length > 0 && loops.every((loop) => loop.state === SUCCEEDED_STATE)) return "done";
  if (loops.some((loop) => FAILED_RUN_STATES.includes(loop.state))) return "failed";
  return "pending";
}

function settleTurn(stages: FlowStage[]): FlowStage[] {
  const turn = stages.findIndex((stage) => stage.state !== "done");
  return stages.map((stage, index) => {
    if (index === turn && stage.state === "pending") return { ...stage, state: "yours" };
    if (index > turn && turn >= 0 && stage.state === "yours") return { ...stage, state: "pending" };
    return stage;
  });
}

export function flowStages(overview: FlowOverview | null): FlowStage[] {
  const packages = overview?.packages ?? [];
  const spec = latestPackage(packages, SPEC_FORMAT);
  const tasks = latestPackage(packages, TASKS_FORMAT);
  const loops = actionsOf(overview, "loop");
  return settleTurn([
    { key: "spec", state: generationState(actionsOf(overview, "create_spec").at(-1) ?? null, spec !== null || tasks !== null) },
    { key: "spec_review", state: tasks ? "done" : reviewState(spec) },
    { key: "tasks", state: generationState(actionsOf(overview, "create_tasks").at(-1) ?? null, tasks !== null) },
    { key: "tasks_review", state: reviewState(tasks) },
    { key: "execution", state: executionState(loops.filter((loop) => !isReviewStep(loop))) },
    { key: "review", state: executionState(loops.filter(isReviewStep)) },
  ]);
}

export function currentStageIndex(stages: FlowStage[]) {
  const turn = stages.findIndex((stage) => stage.state !== "done");
  return turn < 0 ? stages.length - 1 : turn;
}
