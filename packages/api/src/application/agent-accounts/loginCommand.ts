import type { AgentAccountProvider } from "./agentAccountTypes";

export function loginCommandOf(provider: AgentAccountProvider, home: string) {
  return provider === "claude" ? `CLAUDE_CONFIG_DIR='${home}' claude auth login` : `CODEX_HOME='${home}' codex login`;
}
