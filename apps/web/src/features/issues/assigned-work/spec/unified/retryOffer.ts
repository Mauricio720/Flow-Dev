import type { FlowCommands } from "./flowView";
import type { RetryOffer } from "./NowPanel";
import { connectionsFor, movableKinds } from "./retryWorkspace";
import type { FlowOptions, FlowPlan, FlowRun, MovableWorkspaceKind, RetryRuntimeBindings } from "./unifiedContract";

const RETRYABLE_ACTION_STATES = ["failed", "canceled", "blocked"];
const LOCAL_KIND = "local";

export function retryOffer(plan: FlowPlan | null, options: FlowOptions | null, runs: FlowRun[], commands: FlowCommands): RetryOffer | null {
  const action = plan?.actions.find((candidate) => RETRYABLE_ACTION_STATES.includes(candidate.state));
  if (!plan || !action || !options) return null;
  const origin = action.workspace.kind;
  const usable = connectionsFor(options.connections, origin).map((connection) => connection.id);
  const latest = runs.find((run) => run.actionId === action.id);
  const ranHere = latest?.bindings.every((binding) => usable.includes(binding.connectionId));
  const currentAction = latest && ranHere ? { ...action, bindings: latest.bindings } : action;
  const onRetry = (runtimeBindings?: RetryRuntimeBindings, moveTo?: MovableWorkspaceKind) => void commands.retryFailedAction({ actionId: action.id, expectedRevision: plan.revision, local: (moveTo ?? origin) === LOCAL_KIND, runtimeBindings, moveTo });
  return { action: currentAction, connections: options.connections, workspaceKinds: movableKinds(action, options), pending: commands.retryPending, onRetry };
}
