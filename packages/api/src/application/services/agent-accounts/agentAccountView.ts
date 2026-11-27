import type { AgentAccountRecord } from "../../agent-accounts/agentAccountTypes";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import { loginCommandOf } from "../../agent-accounts/loginCommand";

export type AgentAccountView = Omit<AgentAccountRecord, "ownerUserId" | "hostId" | "identity" | "plan" | "codexCatalog" | "checkedAt" | "createdAt" | "removedAt"> & {
  identity: string | null;
  plan: string | null;
  checkedAt: string | null;
  loginCommand: string;
};

export function toAgentAccountView(account: AgentAccountRecord, home: AgentAccountHome): AgentAccountView {
  const path = home.pathOf(account);
  return { id: account.id, provider: account.provider, label: account.label, status: account.status, identity: account.identity, plan: account.plan, checkedAt: account.checkedAt?.toISOString() ?? null, version: account.version, loginCommand: loginCommandOf(account.provider, path) };
}
