import type { WorkAuthorization } from "../assigned-issues/workAuthorization";
import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import type { AgentAccountProvider } from "../../agent-accounts/agentAccountTypes";
import type { TaskAgentAccountDao } from "../../agent-accounts/taskAgentAccountDao";
import { ACCOUNT_NOT_FOUND_MESSAGE, AgentAccountError } from "./agentAccountErrors";
import { toAgentAccountView } from "./agentAccountView";
import { workChoicesOf, type WorkAccountChoice } from "./workAccountChoiceView";

export type WorkAccountErrorReason = "stale" | "not_found" | "account_not_owned" | "account_removed";

export class WorkAccountError extends Error {
  constructor(readonly reason: WorkAccountErrorReason, message: string) { super(message); this.name = "WorkAccountError"; }
}

export class WorkAccountService {
  constructor(private readonly deps: { choices: TaskAgentAccountDao; accounts: AgentAccountDao; home: AgentAccountHome; authorization: Pick<WorkAuthorization, "requireOperate">; hostId: string }) {}

  async get(actorId: string, taskId: string) {
    await this.requireOperator(actorId, taskId);
    const rows = await this.deps.choices.choicesOf(taskId);
    const options = await this.accountOptions(actorId);
    return { choices: workChoicesOf(rows), options, version: rows.reduce((max, row) => Math.max(max, row.version), 0) };
  }

  async set(actorId: string, input: { taskId: string; provider: AgentAccountProvider; accountId: string | null; version: number }): Promise<WorkAccountChoice> {
    await this.requireOperator(actorId, input.taskId);
    await this.requireSelectableAccount(actorId, input.provider, input.accountId);
    const version = await this.deps.choices.set({ ...input, chosenBy: actorId });
    if (version === null) throw new WorkAccountError("stale", "A escolha mudou; recarregue");
    const rows = await this.deps.choices.choicesOf(input.taskId);
    return workChoicesOf(rows).find((choice) => choice.provider === input.provider)!;
  }

  async resolve(input: { taskId: string; agent: AgentAccountProvider; actorId: string }) {
    const choice = (await this.deps.choices.choicesOf(input.taskId)).find((row) => row.provider === input.agent);
    if (!choice) return null;
    if (choice.ownerUserId !== input.actorId) throw new WorkAccountError("account_not_owned", accountOwnerMessage(input.agent));
    if (choice.removedAt) throw new WorkAccountError("account_removed", removedMessage(choice.label, input.agent));
    return choice.accountId;
  }

  private async requireOperator(actorId: string, taskId: string) {
    const projectId = await this.deps.choices.projectIdOf(taskId);
    if (!projectId) throw new WorkAccountError("not_found", "Trabalho não encontrado.");
    await this.deps.authorization.requireOperate({ projectId, taskId, actorId });
  }

  private async requireSelectableAccount(actorId: string, provider: AgentAccountProvider, accountId: string | null) {
    if (accountId === null) return;
    const account = await this.deps.accounts.findById(accountId);
    if (!account || account.ownerUserId !== actorId || account.hostId !== this.deps.hostId || account.removedAt || account.provider !== provider) throw new AgentAccountError("not_found", ACCOUNT_NOT_FOUND_MESSAGE);
  }

  private async accountOptions(ownerUserId: string) {
    const accounts = await this.deps.accounts.listActive({ ownerUserId, hostId: this.deps.hostId });
    return { claude: accounts.filter((account) => account.provider === "claude").map((account) => toAgentAccountView(account, this.deps.home)), codex: accounts.filter((account) => account.provider === "codex").map((account) => toAgentAccountView(account, this.deps.home)) };
  }
}

function accountOwnerMessage(provider: AgentAccountProvider) {
  const name = provider === "claude" ? "Claude Code" : "Codex";
  return `A conta escolhida para o ${name} neste trabalho não é sua. Escolha uma conta sua ou o login padrão.`;
}

function removedMessage(label: string, provider: AgentAccountProvider) {
  return `A conta ${label} foi removida. Escolha outra conta para o ${provider === "claude" ? "Claude Code" : "Codex"}.`;
}
