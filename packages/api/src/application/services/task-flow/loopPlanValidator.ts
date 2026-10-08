import type { LoopDefinition } from "../../software/compozyControlGateway";
import type { LoopFlowAction } from "./flowContracts";
import { TaskFlowError } from "./taskFlowErrors";

const SUPPORTED_INPUT_KINDS = ["string", "number", "boolean", "enum"];
const UNSAFE_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const PATH_TRAVERSAL = /(^|[\\/])\.\.([\\/]|$)/;

function typeMatches(kind: string, value: unknown) {
  if (kind === "number") return typeof value === "number" && Number.isFinite(value);
  if (kind === "boolean") return typeof value === "boolean";
  return typeof value === "string" && !UNSAFE_TEXT.test(value) && !PATH_TRAVERSAL.test(value);
}

export function offerability(definition: LoopDefinition): string | null {
  if (!definition.enabled) return "loop_disabled";
  if (definition.runtimeLocked || definition.runtimeRoles.length === 0) return "runtime_not_overridable";
  const unsupported = definition.inputs.some((input) => input.required && !input.hasDefault && !SUPPORTED_INPUT_KINDS.includes(input.kind));
  return unsupported ? "unsupported_required_input" : null;
}

function assertInputs(definition: LoopDefinition, inputs: Record<string, unknown>) {
  const declared = new Map(definition.inputs.map((input) => [input.name, input]));
  for (const [name, value] of Object.entries(inputs)) {
    const input = declared.get(name);
    if (!input || !typeMatches(input.kind, value)) throw new TaskFlowError("loop_input_invalid");
    if (input.enumValues && !input.enumValues.includes(String(value))) throw new TaskFlowError("loop_input_invalid");
  }
  const missing = definition.inputs.some((input) => input.required && !input.hasDefault && !(input.name in inputs));
  if (missing) throw new TaskFlowError("loop_input_invalid");
}

function assertRoles(definition: LoopDefinition, bindings: Record<string, unknown>) {
  const provided = Object.keys(bindings);
  if (provided.some((role) => !definition.runtimeRoles.includes(role))) throw new TaskFlowError("loop_runtime_binding_invalid");
  if (definition.runtimeRoles.some((role) => !provided.includes(role))) throw new TaskFlowError("loop_runtime_binding_missing");
}

export class LoopPlanValidator {
  validate(action: LoopFlowAction, definition: LoopDefinition | null) {
    if (!definition || offerability(definition)) throw new TaskFlowError("loop_unavailable");
    if (definition.version !== action.loopVersion) throw new TaskFlowError("loop_version_changed");
    assertInputs(definition, action.inputs);
    assertRoles(definition, action.runtimeBindings);
  }
}
