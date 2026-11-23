import type { RuntimeHandlers, RuntimePermissionResult } from "../../application/terminal/claudeSessionRuntime";
import { mainAssistantText } from "../../application/services/terminal/assistantTextFilter";
import type { ScriptStep } from "./scriptedSessionSteps";

type SayStep = Extract<ScriptStep, { kind: "text" | "thinking" | "tool_result" | "subagent_text" }>;
type RequestStep = Extract<ScriptStep, { kind: "ask" | "permission" }>;

const SUBAGENT_TOOL_USE_ID = "toolu_subagent";
const SAY_KINDS = ["text", "thinking", "tool_result", "subagent_text"];

export const isSayStep = (step: ScriptStep): step is SayStep => SAY_KINDS.includes(step.kind);
export const isRequestStep = (step: ScriptStep): step is RequestStep => step.kind === "ask" || step.kind === "permission";

export function sayStep(step: SayStep, handlers: RuntimeHandlers) {
  const blockType = step.kind === "subagent_text" ? "text" : step.kind;
  const parentToolUseId = step.kind === "subagent_text" ? SUBAGENT_TOOL_USE_ID : null;
  const text = mainAssistantText({ parentToolUseId, content: [{ type: blockType, text: step.text }] });
  if (text !== null) handlers.onAssistantText(text);
}

export function requestStep(step: RequestStep, handlers: RuntimeHandlers, toolUseId: string): Promise<RuntimePermissionResult> {
  if (step.kind === "ask") return handlers.onPermission({ toolName: "AskUserQuestion", input: { questions: step.questions }, toolUseId, suggestions: [] });
  return handlers.onPermission({ toolName: step.toolName, input: step.input, toolUseId, suggestions: step.suggestions ?? [] });
}

export async function contentStep(step: ScriptStep, handlers: RuntimeHandlers, toolUseId: string): Promise<RuntimePermissionResult | null> {
  if (isSayStep(step)) sayStep(step, handlers);
  return isRequestStep(step) ? requestStep(step, handlers, toolUseId) : null;
}
