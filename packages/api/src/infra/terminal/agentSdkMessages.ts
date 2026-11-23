import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { mainAssistantText } from "../../application/services/terminal/assistantTextFilter";

export function initSessionId(message: SDKMessage): string | null {
  return message.type === "system" && message.subtype === "init" ? message.session_id : null;
}

export function assistantTextOf(message: SDKMessage): string | null {
  if (message.type !== "assistant") return null;
  return mainAssistantText({ parentToolUseId: message.parent_tool_use_id, content: message.message.content as Array<{ type: string; text?: string }> });
}

const LAUNCH_BLOCKING_ERRORS: ReadonlySet<string> = new Set(["authentication_failed", "oauth_org_not_allowed", "account_on_hold", "verification_required", "billing_error", "cloud_credential_error"]);

export function launchBlockingText(message: SDKMessage): string | null {
  if (message.type !== "assistant" || !message.error || !LAUNCH_BLOCKING_ERRORS.has(message.error)) return null;
  return assistantTextOf(message) ?? message.error;
}
