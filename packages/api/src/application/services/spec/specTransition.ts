import type { SpecRoute, SpecStage, SpecState } from "./specContracts";
import { nextStage, routeStages } from "./specStages";
import { TaskError } from "../tasks/taskErrors";

const ALLOWED: Record<SpecState, readonly SpecState[]> = {
  not_started: ["queued"],
  queued: ["running", "canceled", "failed", "stopping"],
  running: ["waiting_question", "waiting_permission", "finalizing", "stopping", "failed"],
  waiting_question: ["running", "stopping", "failed"],
  waiting_permission: ["running", "stopping", "failed"],
  finalizing: ["review", "failed", "stopping"],
  review: ["queued", "approved"],
  stopping: ["canceled", "failed", "review"],
  failed: ["queued", "review"],
  canceled: ["queued", "review"],
  approved: [],
};

export function assertStageTransition(from: SpecState, to: SpecState) {
  if (from === "approved") throw new TaskError("stage_approved");
  if (!ALLOWED[from].includes(to)) throw new TaskError("spec_conflict");
}

export type SpecStageStates = Partial<Record<SpecStage, SpecState>>;
export type SpecTransitionEvent = { type: "approve"; stage: SpecStage } | { type: "start"; stage: SpecStage };

export function specTransition(input: { route: SpecRoute; stages: SpecStageStates; event: SpecTransitionEvent }) {
  const current = input.stages[input.event.stage] ?? "not_started";
  const target = input.event.type === "approve" ? "approved" : "queued";
  assertStageTransition(current, target);
  if (input.event.type === "approve" && current !== "review") throw new TaskError("spec_conflict");
  const stages = { ...input.stages, [input.event.stage]: target };
  const released = input.event.type === "approve" ? nextStage(input.route, input.event.stage) : null;
  return { stages, released, canStartTasks: canStartTasks(input.route, stages), dispatchCount: 0 };
}

function canStartTasks(route: SpecRoute, stages: SpecStageStates) {
  const required = routeStages(route).filter((stage) => stage !== "tasks");
  return stages.tasks === undefined && required.every((stage) => stages[stage] === "approved");
}
