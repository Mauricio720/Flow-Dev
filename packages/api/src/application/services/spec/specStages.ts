import type { SpecRoute, SpecStage } from "./specContracts";
import { TaskError } from "../tasks/taskErrors";

const ROUTE_STAGES: Record<SpecRoute, readonly SpecStage[]> = {
  prd: ["prd", "tech_spec", "tasks"],
  tech_spec: ["tech_spec", "tasks"],
};

export function routeStages(route: SpecRoute) {
  return ROUTE_STAGES[route];
}

export function assertStagePrerequisite(input: { route: SpecRoute; stage: SpecStage; approved: readonly SpecStage[] }) {
  const stages = routeStages(input.route);
  const index = stages.indexOf(input.stage);
  if (index < 0) throw new TaskError("stage_prerequisite");
  if (!stages.slice(0, index).every((required) => input.approved.includes(required))) throw new TaskError("stage_prerequisite");
}

export function nextStage(route: SpecRoute, stage: SpecStage) {
  const stages = routeStages(route);
  return stages[stages.indexOf(stage) + 1] ?? null;
}

export function requiredUpstream(route: SpecRoute, stage: SpecStage) {
  const stages = routeStages(route);
  return stages.slice(0, stages.indexOf(stage));
}
