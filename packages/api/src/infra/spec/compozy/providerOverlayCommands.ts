import type { ProviderOverlayInput } from "../../../application/software/compozyControlGateway";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CLAUDE_AGENT_COMMAND = ["npx", "-y", "@agentclientprotocol/claude-agent-acp"];
const OPEN_CODE_AUTH_STATUS = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../runtime/acp/openCodeAuthStatus.mjs");

export type OverlayOptions = { claudeAgentWrapper?: string };

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function overlaySettings(input: ProviderOverlayInput, options: OverlayOptions = {}) {
  const home = shellQuote(input.homePath);
  const isCodex = input.providerKind === "codex";
  const isOpenCode = input.providerKind === "opencode";
  const claudeAgent = [options.claudeAgentWrapper, ...CLAUDE_AGENT_COMMAND].filter(Boolean).join(" ");
  return {
    display_name: input.label,
    runtime_provider: input.providerKind,
    command: isCodex ? `env CODEX_HOME=${home} npx -y @agentclientprotocol/codex-acp` : isOpenCode ? `env HOME=${home} opencode acp` : `env CLAUDE_CONFIG_DIR=${home} ${claudeAgent}`,
    auth_status_command: isCodex ? `env CODEX_HOME=${home} codex login status -c cli_auth_credentials_store=file` : isOpenCode ? `env HOME=${home} node ${shellQuote(OPEN_CODE_AUTH_STATUS)}` : `env CLAUDE_CONFIG_DIR=${home} claude auth status`,
    auth_mode: "native_cli",
    home_policy: "operator",
    env_policy: "filtered",
  };
}
