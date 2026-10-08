import type { PlannedAction, RuntimeBindingRecord } from "../../database/dao/taskFlowDao";
import { SKILL_ROLE, type FlowAction, type RuntimeChoice } from "./flowContracts";

const DEFAULT_LANGUAGE = "pt-BR";

function toBinding(role: string, choice: RuntimeChoice): RuntimeBindingRecord {
  return { role, connectionId: choice.connectionId, providerId: choice.providerId, modelId: choice.modelId, reasoningEffort: choice.reasoningEffort };
}

export function bindingChoices(action: FlowAction): [string, RuntimeChoice][] {
  if (action.kind === "loop") return Object.entries(action.runtimeBindings);
  return [[SKILL_ROLE, action.runtime]];
}

export function toPlannedAction(action: FlowAction, position: number): PlannedAction {
  const bindings = bindingChoices(action).map(([role, choice]) => toBinding(role, choice));
  if (action.kind === "loop") return { position, kind: "loop", loopName: action.loopName, loopVersion: action.loopVersion, inputs: action.inputs, workspace: action.workspace, bindings };
  return { position, kind: action.kind, loopName: null, loopVersion: null, inputs: { language: action.language }, workspace: action.workspace, bindings };
}

export function fromPlannedAction(action: PlannedAction): FlowAction {
  const choices = Object.fromEntries(action.bindings.map((binding) => [binding.role, { connectionId: binding.connectionId, providerId: binding.providerId, modelId: binding.modelId, reasoningEffort: binding.reasoningEffort }]));
  if (action.kind === "loop") return { kind: "loop", loopName: action.loopName!, loopVersion: action.loopVersion!, inputs: action.inputs, runtimeBindings: choices, workspace: action.workspace };
  const language = action.inputs.language === "en" ? "en" : DEFAULT_LANGUAGE;
  return { kind: action.kind, language, runtime: choices[SKILL_ROLE]!, workspace: action.workspace };
}
