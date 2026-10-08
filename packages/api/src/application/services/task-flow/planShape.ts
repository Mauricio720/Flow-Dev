import { MAX_PLAN_ACTIONS, type FlowAction } from "./flowContracts";
import { reviewFollowsImplementation } from "./loopOrder";
import { TaskFlowError } from "./taskFlowErrors";

export function assertPlanShape(actions: FlowAction[]) {
  if (actions.length === 0 || actions.length > MAX_PLAN_ACTIONS) throw new TaskFlowError("invalid_input");
  const kinds = actions.map((action) => action.kind);
  if (kinds.filter((kind) => kind === "create_spec").length > 1) throw new TaskFlowError("invalid_input");
  if (kinds.filter((kind) => kind === "create_tasks").length > 1) throw new TaskFlowError("invalid_input");
  const specIndex = kinds.indexOf("create_spec");
  const tasksIndex = kinds.indexOf("create_tasks");
  if (specIndex > 0) throw new TaskFlowError("invalid_input");
  if (tasksIndex >= 0 && specIndex > tasksIndex) throw new TaskFlowError("invalid_input");
  if (tasksIndex >= 0 && kinds.slice(0, tasksIndex).includes("loop")) throw new TaskFlowError("invalid_input");
  if (!reviewFollowsImplementation(actions)) throw new TaskFlowError("stage_prerequisite");
}
