import { DIRECT_ACTION_KIND, DIRECT_PLANNING_ROUTE } from "../task-flow/directExecution";
import { TaskError } from "./taskErrors";

export type ReplanAction = { kind: string; state: string };
export type ReplanFacts = { planningStatus: string | null; activeOperationId: string | null; selectedRoute: string | null; sourceChanged: boolean; actions: ReplanAction[] };

const APPROVED_PLANNING_STATUS = "approved";
const UNSETTLED_ACTION_STATES = ["queued", "running", "reconciling", "succeeded"];
const STOPPED_ACTION_STATES = ["failed", "blocked", "canceled"];

function directExecutionStopped(facts: ReplanFacts) {
  if (facts.selectedRoute !== DIRECT_PLANNING_ROUTE) return false;
  return facts.actions.some((action) => action.kind === DIRECT_ACTION_KIND && STOPPED_ACTION_STATES.includes(action.state));
}

export function canReplan(facts: ReplanFacts) {
  if (facts.planningStatus !== APPROVED_PLANNING_STATUS || facts.activeOperationId) return false;
  if (facts.actions.some((action) => UNSETTLED_ACTION_STATES.includes(action.state))) return false;
  return facts.sourceChanged || directExecutionStopped(facts);
}

export function assertReplannable(facts: ReplanFacts) {
  if (!canReplan(facts)) throw new TaskError("replan_unavailable");
}
