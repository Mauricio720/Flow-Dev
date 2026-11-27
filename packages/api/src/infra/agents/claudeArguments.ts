import type { AgentChoice } from "../../application/agents/agentTypes";

export const CLAUDE_TOOL_PATTERN = "mcp__flow__*";
export const CLAUDE_MCP_SERVER = "flow";

type ClaudeArgumentInput = { choice: AgentChoice; instructions: string; schema: object; mcpConfigPath: string; withImages: boolean };

function outputArguments(withImages: boolean) {
  return withImages ? ["--input-format", "stream-json", "--output-format", "stream-json", "--verbose"] : ["--output-format", "json"];
}

export function claudeArguments(input: ClaudeArgumentInput) {
  return [
    "-p",
    ...outputArguments(input.withImages),
    "--json-schema", JSON.stringify(input.schema),
    "--tools", "",
    "--strict-mcp-config",
    "--mcp-config", input.mcpConfigPath,
    "--allowedTools", CLAUDE_TOOL_PATTERN,
    "--setting-sources", "",
    "--no-session-persistence",
    "--system-prompt", input.instructions,
    "--model", input.choice.model,
    "--effort", input.choice.effort,
  ];
}

export function claudeMcpConfig(context: { url: string; capability: string }) {
  const server = { type: "http", url: context.url, headers: { Authorization: `Bearer ${context.capability}` } };
  return JSON.stringify({ mcpServers: { [CLAUDE_MCP_SERVER]: server } });
}

export function withoutSchemaMeta(schema: object) {
  const { $schema: _ignored, ...rest } = schema as Record<string, unknown>;
  return rest;
}
