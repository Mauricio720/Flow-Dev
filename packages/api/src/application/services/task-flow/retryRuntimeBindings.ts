import type { PlannedAction } from "../../database/dao/taskFlowDao";
import type { LoopDefinition } from "../../software/compozyControlGateway";
import { bindingChoices, fromPlannedAction } from "./planProposal";
import type { FlowAction, RuntimeChoice, WorkspaceChoice } from "./flowContracts";
import { TaskFlowError } from "./taskFlowErrors";
import type { LoopAdmission } from "./taskFlowPorts";

export type RetryRuntimeBindings = Record<string, RuntimeChoice>;
export type LiveLoop = Pick<LoopDefinition, "version" | "runtimeRoles">;
type RetriedAction = { loops?: LoopAdmission; taskId: string; action: PlannedAction; bindings?: RetryRuntimeBindings; workspace?: WorkspaceChoice };

export function actionWithRetryBindings(action: PlannedAction, bindings?: RetryRuntimeBindings, live?: LiveLoop | null): FlowAction {
  const planned = fromPlannedAction(action);
  if (!bindings) return planned;
  const roles = planned.kind === "loop" && live ? live.runtimeRoles : bindingChoices(planned).map(([role]) => role);
  const submitted = Object.keys(bindings);
  if (submitted.length !== roles.length || submitted.some((role) => !roles.includes(role))) throw new TaskFlowError("invalid_input");
  if (planned.kind === "loop") return { ...planned, loopVersion: live?.version ?? planned.loopVersion, runtimeBindings: bindings };
  return { ...planned, runtime: bindings.main! };
}

/** A retry that chooses its runtimes again follows the Loop definition in use now, so an action planned on an older version can still run. */
export async function retriedAction(input: RetriedAction): Promise<FlowAction> {
  const planned = fromPlannedAction(input.action);
  if (!input.bindings || planned.kind !== "loop" || !input.loops?.current) return actionWithRetryBindings(input.action, input.bindings);
  const live = await input.loops.current({ taskId: input.taskId, action: { ...planned, workspace: input.workspace ?? planned.workspace } });
  return actionWithRetryBindings(input.action, input.bindings, live);
}

export function sameRetryBindings(action: FlowAction, bindings: RetryRuntimeBindings) {
  const current = Object.fromEntries(bindingChoices(action));
  const roles = Object.keys(current);
  return roles.length === Object.keys(bindings).length && roles.every((role) => {
    const actual = current[role];
    const expected = bindings[role];
    return actual?.connectionId === expected?.connectionId && actual?.providerId === expected?.providerId && actual?.modelId === expected?.modelId && actual?.reasoningEffort === expected?.reasoningEffort;
  });
}
