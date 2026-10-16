import type { FlowAction } from "./flowContracts";
import { isPullRequestAction } from "./pullRequestAction";
import { TaskFlowError } from "./taskFlowErrors";

export const DIRECT_ACTION_KIND = "direct_execute";
export const DIRECT_PLANNING_ROUTE = "direct_execution";
export const DIRECT_AGENT_NAME = "flow-direct";
export const DIRECT_SKILL_NAME = "flow-direct-executor";

export type FlowRoute = "spec" | "direct";

const SPEC_ROUTE: FlowRoute = "spec";
const DIRECT_ROUTE: FlowRoute = "direct";
const LOCAL_WORKSPACE = "local";

export const isDirectAction = (action: { kind: string }) => action.kind === DIRECT_ACTION_KIND;

export function flowRouteOf(selectedRoute: string | null | undefined): FlowRoute {
  return selectedRoute === DIRECT_PLANNING_ROUTE ? DIRECT_ROUTE : SPEC_ROUTE;
}

/** Direct execution replaces the whole spec pipeline: it opens its plan, runs on the operator's machine and may only be followed by publishing its result. */
export function assertRouteShape(actions: FlowAction[], route: FlowRoute = SPEC_ROUTE) {
  const direct = actions.filter(isDirectAction);
  if (route === SPEC_ROUTE && direct.length > 0) throw new TaskFlowError("route_unsupported");
  if (route === SPEC_ROUTE) return;
  const followers = actions.slice(1);
  if (direct.length !== 1 || !isDirectAction(actions[0]!) || followers.some((action) => !isPullRequestAction(action))) throw new TaskFlowError("route_unsupported");
  if (direct[0]!.workspace.kind !== LOCAL_WORKSPACE) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "local_required" });
}
