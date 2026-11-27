import type { AgentChoice } from "../../application/agents/agentTypes";

export const CODEX_TOKEN_VARIABLE = "FLOW_CONTEXT_TOKEN";

const DISABLED_FEATURES = ["shell_tool", "unified_exec", "multi_agent", "multi_agent_v2", "apps", "browser_use", "browser_use_external", "computer_use", "image_generation", "view_image", "skill_search", "plugins", "hooks", "goals", "memories", "tool_suggest", "sleep_tool", "shell_snapshot"];

type CodexArgumentInput = { choice: AgentChoice; workDirectory: string; schemaPath: string; contextUrl: string; imagePaths: string[] };

export function codexArguments(input: CodexArgumentInput) {
  return [
    "exec",
    ...input.imagePaths.flatMap((imagePath) => ["--image", imagePath]),
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-user-config",
    "--ignore-rules",
    "-C", input.workDirectory,
    "-s", "read-only",
    "--output-schema", input.schemaPath,
    "--json",
    "-m", input.choice.model,
    "-c", `model_reasoning_effort=${input.choice.effort}`,
    "-c", `mcp_servers.flow.url="${input.contextUrl}"`,
    "-c", `mcp_servers.flow.bearer_token_env_var=${CODEX_TOKEN_VARIABLE}`,
    "-c", "mcp_servers.flow.default_tools_approval_mode=approve",
    "-c", 'web_search="disabled"',
    ...DISABLED_FEATURES.flatMap((feature) => ["--disable", feature]),
    "-",
  ];
}
