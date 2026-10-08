import type { PlannedAction } from "../../database/dao/taskFlowDao";
import { bindingChoices, fromPlannedAction } from "./planProposal";
import type { FlowAction, RuntimeChoice } from "./flowContracts";
import { TaskFlowError } from "./taskFlowErrors";

export type RetryRuntimeBindings = Record<string, RuntimeChoice>;

export function actionWithRetryBindings(action: PlannedAction, bindings?: RetryRuntimeBindings): FlowAction {
  const planned = fromPlannedAction(action);
  if (!bindings) return planned;
  const roles = bindingChoices(planned).map(([role]) => role);
  const submitted = Object.keys(bindings);
  if (submitted.length !== roles.length || submitted.some((role) => !roles.includes(role))) throw new TaskFlowError("invalid_input");
  if (planned.kind === "loop") return { ...planned, runtimeBindings: bindings };
  return { ...planned, runtime: bindings.main! };
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
