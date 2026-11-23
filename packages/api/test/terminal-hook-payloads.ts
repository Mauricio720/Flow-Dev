import { readFileSync } from "node:fs";

const FIXTURES = new URL("./fixtures/terminal-hooks/", import.meta.url);

export const FIXTURE_CHECKOUT = "/tmp/flow-dev-clone";

export function hookFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURES), "utf8"));
}

export function postToolUsePayload(toolName: string, toolInput: unknown) {
  return { hook_event_name: "PostToolUse", session_id: "s", tool_name: toolName, tool_input: toolInput };
}

export function promptPayload(text: string) {
  return { hook_event_name: "UserPromptSubmit", session_id: "s", prompt: text };
}
