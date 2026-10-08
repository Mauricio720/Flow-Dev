import { describe, expect, it } from "vitest";
import { planOf } from "@/test/taskFlow";
import { draftLoopInputs, isDirty } from "./planDirty";
import type { DraftAction, FlowPlan } from "./unifiedContract";

const LOCAL = { kind: "local" } as const;

function loopPlan(): FlowPlan {
  const plan = planOf();
  const action = { ...plan.actions[0]!, kind: "loop", loopName: "implement-tasks", loopVersion: "0", inputs: { slug: "t1", auto_commit: true }, workspace: LOCAL, bindings: [{ ...plan.actions[0]!.bindings[0]!, role: "default_runtime" }] };
  return { ...plan, actions: [action] } as FlowPlan;
}

function draftOf(plan: FlowPlan): DraftAction[] {
  return plan.actions.map((action) => ({
    kind: "loop", language: "pt-BR", runtime: null, workspace: LOCAL,
    loop: { name: action.loopName ?? "", version: action.loopVersion ?? "", inputs: draftLoopInputs(action), runtimes: Object.fromEntries(action.bindings.map((binding) => [binding.role, { connectionId: binding.connectionId, modelId: binding.modelId, reasoningEffort: binding.reasoningEffort }])) },
  }));
}

describe("plan dirty check", () => {
  it("treats a saved loop with boolean inputs as clean", () => {
    const plan = loopPlan();
    expect(isDirty(plan, draftOf(plan))).toBe(false);
  });

  it("flags an edited loop input", () => {
    const plan = loopPlan();
    const [action] = draftOf(plan);
    expect(isDirty(plan, [{ ...action!, loop: { ...action!.loop!, inputs: { slug: "t1", auto_commit: "false" } } }])).toBe(true);
  });

  it("is dirty while nothing was saved", () => {
    expect(isDirty(null, [])).toBe(true);
  });
});
