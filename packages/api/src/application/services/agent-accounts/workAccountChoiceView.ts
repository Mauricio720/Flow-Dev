import type { AgentAccountProvider, AgentAccountStatus } from "../../agent-accounts/agentAccountTypes";
import type { TaskAgentAccountChoice } from "../../agent-accounts/taskAgentAccountDao";

export type WorkAccountChoice = { provider: AgentAccountProvider; accountId: string | null; label: string; status: AgentAccountStatus | "default" };
export const DEFAULT_ACCOUNT_LABEL = "Login padrão desta máquina";

export function workChoicesOf(rows: TaskAgentAccountChoice[]): WorkAccountChoice[] {
  return (["claude", "codex"] as const).map((provider) => {
    const choice = rows.find((row) => row.provider === provider);
    return choice ? { provider, accountId: choice.accountId, label: choice.label, status: choice.status } : { provider, accountId: null, label: DEFAULT_ACCOUNT_LABEL, status: "default" };
  });
}
