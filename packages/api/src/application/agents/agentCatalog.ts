import type { AgentChoice, AgentProvider } from "./agentTypes";
import { AGENT_EFFORTS } from "./agentTypes";

export const AGENT_CATALOG: Record<AgentProvider, readonly string[]> = {
  claude: ["sonnet", "opus", "haiku"],
  codex: ["gpt-6.1-sol"],
};

export const DEFAULT_AGENT_CHOICE: AgentChoice = { provider: "claude", model: "sonnet", effort: "low" };

export function isCatalogModel(provider: AgentProvider, model: string) {
  return AGENT_CATALOG[provider]?.includes(model) ?? false;
}

export function isCatalogChoice(choice: AgentChoice) {
  return isCatalogModel(choice.provider, choice.model) && AGENT_EFFORTS.includes(choice.effort);
}
