import type { AgentProvider } from "../../application/agents/agentTypes";

export type ProviderInfo = { label: string; command: string; loginHint: string };

export const PROVIDER_INFO: Record<AgentProvider, ProviderInfo> = {
  claude: { label: "Claude Code", command: "claude", loginHint: "rode `claude` e faça login" },
  codex: { label: "Codex", command: "codex", loginHint: "rode `codex login`" },
};

export function unavailableDetail(provider: AgentProvider, reason: string) {
  return `${PROVIDER_INFO[provider].label}: ${reason}`;
}
