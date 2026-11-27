import type { AgentAccount } from "@/features/agent-accounts/types";

const ACCOUNT_ROOT = "/home/ana/.local/state/flow-dev/agent-accounts";

export function accountOf(id: string, changes: Partial<AgentAccount> = {}): AgentAccount {
  const provider = changes.provider ?? "claude";
  const home = `${ACCOUNT_ROOT}/${id}`;
  const loginCommand = provider === "claude" ? `CLAUDE_CONFIG_DIR='${home}' claude auth login` : `CODEX_HOME='${home}' codex login`;
  return { id, provider, label: id, status: "pending_login", identity: null, plan: null, checkedAt: null, version: 1, loginCommand, ...changes };
}
