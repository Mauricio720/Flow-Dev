import type { ActionRecord } from "../../database/dao/taskFlowDao";
import type { FlowAction } from "./flowContracts";
import { withoutLocalTarget } from "./localTargetBinding";
import { fromPlannedAction } from "./planProposal";
import { stableJson } from "./stableJson";
import { TaskFlowError } from "./taskFlowErrors";

const PLANNED_STATE = "planned";

export function startedActions(actions: ActionRecord[]) {
  return actions.filter((action) => action.state !== PLANNED_STATE);
}

export function assertStartedActionsUnchanged(current: ActionRecord[], proposed: FlowAction[]) {
  const started = startedActions(current);
  const unchanged = started.every((action, index) => stableJson(withoutLocalTarget(fromPlannedAction(action))) === stableJson(proposed[index] && withoutLocalTarget(proposed[index])));
  if (!unchanged) throw new TaskFlowError("action_already_started");
}
