import { describe, expect, it } from "vitest";
import type { LoopDefinition } from "../../software/compozyControlGateway";
import type { LoopFlowAction } from "./flowContracts";
import { LoopPlanValidator, offerability } from "./loopPlanValidator";
import { TaskFlowError } from "./taskFlowErrors";

const DEFINITION: LoopDefinition = {
  name: "implement-tasks", version: "3", source: "bundled", enabled: true, description: "Implementa as tarefas",
  inputs: [{ name: "max_rounds", kind: "number", required: false, hasDefault: true, enumValues: null }, { name: "focus", kind: "string", required: true, hasDefault: false, enumValues: null }],
  runtimeRoles: ["backend_runtime", "frontend_runtime"], runtimeLocked: false, requires: ["tasks_approved"],
};
const RUNTIME = { connectionId: "c1", providerId: "codex" as const, modelId: "gpt-5.6-sol", reasoningEffort: "high" };
const action = (overrides: Partial<LoopFlowAction> = {}): LoopFlowAction => ({ kind: "loop", loopName: "implement-tasks", loopVersion: "3", inputs: { focus: "api" }, runtimeBindings: { backend_runtime: RUNTIME, frontend_runtime: RUNTIME }, workspace: { kind: "isolated" }, ...overrides });
const reasonOf = (candidate: LoopFlowAction, definition: LoopDefinition | null = DEFINITION) => {
  try { new LoopPlanValidator().validate(candidate, definition); } catch (error) { return error instanceof TaskFlowError ? error.reason : "other"; }
  return null;
};

describe("loop plan validator", () => {
  it("UT-013 fails closed when the live Loop version moved past the selected one", () => {
    expect(reasonOf(action({ loopVersion: "2" }))).toBe("loop_version_changed");
    expect(reasonOf(action())).toBeNull();
  });

  it("UT-014 rejects undeclared, unsafe and missing required inputs before dispatch", () => {
    expect(reasonOf(action({ inputs: { focus: "api", surprise: "x" } }))).toBe("loop_input_invalid");
    expect(reasonOf(action({ inputs: { focus: "../../etc/passwd" } }))).toBe("loop_input_invalid");
    expect(reasonOf(action({ inputs: {} }))).toBe("loop_input_invalid");
    expect(reasonOf(action({ inputs: { focus: "api", max_rounds: "many" } }))).toBe("loop_input_invalid");
    const withEnum = { ...DEFINITION, inputs: [{ name: "mode", kind: "string", required: true, hasDefault: false, enumValues: ["per-task", "orchestrated"] }] };
    expect(reasonOf(action({ inputs: { mode: "chaos" } }), withEnum)).toBe("loop_input_invalid");
    expect(reasonOf(action({ inputs: { mode: "per-task" } }), withEnum)).toBeNull();
  });

  it("UT-021 rejects a missing declared runtime role and IT-115 an undeclared one", () => {
    expect(reasonOf(action({ runtimeBindings: { backend_runtime: RUNTIME } }))).toBe("loop_runtime_binding_missing");
    expect(reasonOf(action({ runtimeBindings: { backend_runtime: RUNTIME, frontend_runtime: RUNTIME, extra_runtime: RUNTIME } }))).toBe("loop_runtime_binding_invalid");
  });

  it("IT-100 and IT-101 exclude disabled, runtime-locked and unsupported-input Loops with a reason", () => {
    expect(reasonOf(action(), null)).toBe("loop_unavailable");
    expect(offerability({ ...DEFINITION, enabled: false })).toBe("loop_disabled");
    expect(offerability({ ...DEFINITION, runtimeLocked: true })).toBe("runtime_not_overridable");
    expect(offerability({ ...DEFINITION, runtimeRoles: [] })).toBe("runtime_not_overridable");
    expect(offerability({ ...DEFINITION, inputs: [{ name: "secret", kind: "secret", required: true, hasDefault: false, enumValues: null }] })).toBe("unsupported_required_input");
    expect(offerability(DEFINITION)).toBeNull();
  });
});
