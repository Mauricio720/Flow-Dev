import { TaskError } from "./taskErrors";

export type ReplanFacts = { planningStatus: string | null; activeOperationId: string | null; sourceChanged: boolean };

const APPROVED_PLANNING_STATUS = "approved";

export function canReplan(facts: ReplanFacts) {
  if (facts.planningStatus !== APPROVED_PLANNING_STATUS || facts.activeOperationId) return false;
  return facts.sourceChanged;
}

export function assertReplannable(facts: ReplanFacts) {
  if (!canReplan(facts)) throw new TaskError("replan_unavailable");
}
