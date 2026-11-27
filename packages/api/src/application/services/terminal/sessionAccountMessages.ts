import type { AgentAccountRecord } from "../../agent-accounts/agentAccountTypes";
import { loginCommandOf } from "../../agent-accounts/loginCommand";

export function accountLoggedOut(account: AgentAccountRecord, home: string) {
  const provider = account.provider === "claude" ? "Claude Code" : "Codex";
  return `A conta ${account.label} (${provider}) não está logada. Rode \`${loginCommandOf(account.provider, home)}\`.`;
}

export function accountCheckFailed(label: string) {
  return `Não foi possível verificar o login da conta ${label}. Tente de novo.`;
}

export function accountUnavailable() {
  return "A conta desta sessão não está disponível nesta máquina.";
}
