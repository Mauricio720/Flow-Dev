import type { CodexItemInput } from "./codexItemInput";
import { codexTextOf } from "./codexItemInput";

const AGENT_MESSAGE = "agentMessage";

export function codexAssistantText(input: CodexItemInput): string | null {
  if (!input.completed || input.threadId !== input.mainThreadId || input.item.type !== AGENT_MESSAGE) return null;
  return codexTextOf(input.item);
}
