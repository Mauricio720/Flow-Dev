export type AgentProvider = "claude" | "codex";
export type AgentEffort = "low" | "medium" | "high";
export type AgentKind = "issue_author" | "planning";
export type AgentChoice = { provider: AgentProvider; model: string; effort: AgentEffort };

export const AGENT_KINDS: readonly AgentKind[] = ["issue_author", "planning"];
export const AGENT_PROVIDERS: readonly AgentProvider[] = ["claude", "codex"];
export const AGENT_EFFORTS: readonly AgentEffort[] = ["low", "medium", "high"];
