import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountRecord } from "../../agent-accounts/agentAccountTypes";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import { ACCOUNT_NOT_FOUND_MESSAGE, AgentAccountError } from "./agentAccountErrors";

export class AgentAccountRemoval {
  constructor(private readonly deps: { accounts: AgentAccountDao; home: AgentAccountHome; now?: () => Date; log?: (message: string) => void }) {}

  async remove(account: AgentAccountRecord) {
    const result = await this.deps.accounts.markRemovedIfIdle({ id: account.id, at: (this.deps.now ?? (() => new Date()))() });
    if (result.openSessionCount > 0) throw new AgentAccountError("has_open_sessions", openSessionsMessage(result.openSessionCount), result.openSessionCount);
    if (!result.removed) throw new AgentAccountError("not_found", ACCOUNT_NOT_FOUND_MESSAGE);
    const outcome = await this.deps.home.logoutAndDelete(account);
    (this.deps.log ?? console.info)(`[accounts] removed logout=${outcome.logout}`);
    return { removed: true as const };
  }
}

function openSessionsMessage(count: number) {
  if (count === 1) return "Esta conta tem 1 sessão não encerrada. Encerre-a antes de remover a conta.";
  return `Esta conta tem ${count} sessões não encerradas. Encerre-as antes de remover a conta.`;
}
