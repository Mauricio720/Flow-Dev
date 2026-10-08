"use client";

import { useState } from "react";
import { draftLoopInputs } from "./planDirty";
import type { DocumentLanguage, DraftAction, DraftLoop, DraftRuntime, DraftWorkspace, FlowAction, FlowLoopOption, FlowPlan } from "./unifiedContract";

const ISOLATED: DraftWorkspace = { kind: "isolated" };
const DEFAULT_LANGUAGE: DocumentLanguage = "pt-BR";

const toRuntime = (binding: FlowAction["bindings"][number]): DraftRuntime => ({ connectionId: binding.connectionId, modelId: binding.modelId, reasoningEffort: binding.reasoningEffort });

function toLoop(action: FlowAction): DraftLoop {
  return { name: action.loopName ?? "", version: action.loopVersion ?? "", inputs: draftLoopInputs(action), runtimes: Object.fromEntries(action.bindings.map((binding) => [binding.role, toRuntime(binding)])) };
}

function toDraft(action: FlowAction): DraftAction {
  const kind = action.kind as DraftAction["kind"];
  const workspace = action.workspace as DraftWorkspace;
  if (kind === "loop") return { kind, language: DEFAULT_LANGUAGE, runtime: null, workspace, loop: toLoop(action) };
  const language = action.inputs.language === "en" ? "en" : DEFAULT_LANGUAGE;
  return { kind, language, runtime: action.bindings[0] ? toRuntime(action.bindings[0]) : null, workspace };
}

function draftFrom(plan: FlowPlan | null): DraftAction[] {
  return plan ? plan.actions.map(toDraft) : [{ kind: "create_spec", language: DEFAULT_LANGUAGE, runtime: null, workspace: ISOLATED }];
}

export function usePlanDraft(plan: FlowPlan | null) {
  const revision = plan?.revision ?? 0;
  const [seen, setSeen] = useState(revision);
  const [draft, setDraft] = useState(() => draftFrom(plan));
  if (seen !== revision) {
    setSeen(revision);
    setDraft(draftFrom(plan));
  }
  const patch = (index: number, change: Partial<DraftAction>) => setDraft((current) => current.map((action, position) => (position === index ? { ...action, ...change } : action)));
  const setRuntime = (index: number, runtime: DraftRuntime | null) => patch(index, { runtime });
  const setLanguage = (index: number, language: DocumentLanguage) => patch(index, { language });
  const setWorkspace = (index: number, workspace: DraftWorkspace) => patch(index, { workspace });
  const setLoop = (index: number, loop: DraftLoop) => patch(index, { loop });
  const addAction = (kind: "create_tasks") => setDraft((current) => (current.some((action) => action.kind === kind) ? current : [...current, { kind, language: current[0]?.language ?? DEFAULT_LANGUAGE, runtime: null, workspace: current[0]?.workspace ?? ISOLATED }]));
  const addLoop = (option: FlowLoopOption, taskId: string) => setDraft((current) => [...current, { kind: "loop", language: DEFAULT_LANGUAGE, runtime: null, workspace: option.name === "implement-tasks" ? { kind: "unselected" } : current.at(-1)?.workspace ?? ISOLATED, loop: { name: option.name, version: option.version, inputs: Object.fromEntries(option.inputs.filter((input) => (option.name === "implement-tasks" && input.name === "slug") || (option.name === "review-and-fix" && input.name === "task_name")).map((input) => [input.name, taskId])), runtimes: Object.fromEntries(option.runtimeRoles.map((role) => [role, null])) } }]);
  const removeAction = (index: number) => setDraft((current) => current.filter((_, position) => position !== index));
  const renewLoop = (index: number, option: FlowLoopOption) => setDraft((current) => current.map((action, position) => {
    if (position !== index || !action.loop) return action;
    const inputs = Object.fromEntries(option.inputs.map((input) => [input.name, action.loop?.inputs[input.name] ?? ""]));
    const runtimes = Object.fromEntries(option.runtimeRoles.map((role) => [role, action.loop?.runtimes[role] ?? null]));
    return { ...action, loop: { name: option.name, version: option.version, inputs, runtimes } };
  }));
  return { draft, setRuntime, setLanguage, setWorkspace, setLoop, addAction, addLoop, removeAction, renewLoop, revision };
}
