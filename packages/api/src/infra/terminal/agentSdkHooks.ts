import type { HookCallback, Options } from "@anthropic-ai/claude-agent-sdk";
import type { HookPayload } from "../../application/terminal/claudeSessionRuntime";

const FILE_AND_COMMAND_TOOLS_MATCHER = "Write|Edit|MultiEdit|NotebookEdit|Bash|Skill";

export function buildHooks(onHook: (payload: HookPayload) => void): Options["hooks"] {
  const callback: HookCallback = async (input) => {
    onHook(input as unknown as HookPayload);
    return {};
  };
  return {
    UserPromptSubmit: [{ hooks: [callback] }],
    PostToolUse: [{ matcher: FILE_AND_COMMAND_TOOLS_MATCHER, hooks: [callback] }],
    Stop: [{ hooks: [callback] }],
  };
}
