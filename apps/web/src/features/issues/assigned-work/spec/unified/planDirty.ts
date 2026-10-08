import type { DraftAction, FlowAction, FlowPlan } from "./unifiedContract";

const DEFAULT_LANGUAGE = "pt-BR";
const fingerprint = (items: unknown[]) => JSON.stringify(items);

export function draftLoopInputs(action: FlowAction): Record<string, string> {
  return Object.fromEntries(Object.entries(action.inputs).map(([name, value]) => [name, String(value)]));
}

export function isDirty(plan: FlowPlan | null, draft: DraftAction[]) {
  if (!plan) return true;
  const saved = plan.actions.map((action) => [action.kind, action.loopName, action.loopVersion, action.kind === "loop" ? draftLoopInputs(action) : { language: action.inputs.language ?? DEFAULT_LANGUAGE }, action.bindings.map((binding) => [binding.role, binding.connectionId, binding.modelId, binding.reasoningEffort]), action.workspace]);
  const edited = draft.map((action) => [action.kind, action.loop?.name ?? null, action.loop?.version ?? null, action.loop?.inputs ?? { language: action.language }, action.loop ? Object.entries(action.loop.runtimes).map(([role, runtime]) => [role, runtime?.connectionId, runtime?.modelId, runtime?.reasoningEffort ?? null]) : [["main", action.runtime?.connectionId, action.runtime?.modelId, action.runtime?.reasoningEffort ?? null]], action.workspace]);
  return fingerprint(saved) !== fingerprint(edited);
}
