import type { AgentAccountProvider } from "./agentAccountTypes";

export type AgentAccountIdentity = { id: string; provider: AgentAccountProvider };

export interface AgentAccountHome {
  ensure(account: AgentAccountIdentity): Promise<string>;
  pathOf(account: Pick<AgentAccountIdentity, "id">): string;
  logoutAndDelete(account: AgentAccountIdentity): Promise<{ logout: "ok" | "failed" }>;
}
