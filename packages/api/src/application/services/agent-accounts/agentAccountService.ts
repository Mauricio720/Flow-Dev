import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import { AgentAccountLabelTaken } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import type { AgentAccountProvider } from "../../agent-accounts/agentAccountTypes";
import type { AgentLoginInspector } from "../../agent-accounts/agentLoginInspector";
import type { CodexCatalogProbe } from "../../terminal/codexCatalogProbe";
import { ACCOUNT_NOT_FOUND_MESSAGE, AgentAccountError } from "./agentAccountErrors";
import { duplicateLabelMessage, normalizeAgentAccountLabel } from "./agentAccountLabel";
import { toAgentAccountView, type AgentAccountView } from "./agentAccountView";
import { AgentAccountVerification } from "./agentAccountVerification";
import { AgentAccountRemoval } from "./agentAccountRemoval";

export type AgentAccountServiceDeps = { accounts: AgentAccountDao; home: AgentAccountHome; inspector: AgentLoginInspector; codexProbe?: CodexCatalogProbe; hostId: string; now?: () => Date; log?: (message: string) => void };

export class AgentAccountService {
  private readonly log: (message: string) => void;
  private readonly verification: AgentAccountVerification;
  private readonly removal: AgentAccountRemoval;

  constructor(private readonly deps: AgentAccountServiceDeps) {
    this.log = deps.log ?? console.info;
    this.verification = new AgentAccountVerification({ accounts: deps.accounts, home: deps.home, inspector: deps.inspector, codexProbe: deps.codexProbe, now: deps.now, log: deps.log });
    this.removal = new AgentAccountRemoval({ accounts: deps.accounts, home: deps.home, now: deps.now, log: deps.log });
  }

  async list(ownerUserId: string): Promise<AgentAccountView[]> {
    const records = await this.deps.accounts.listActive({ ownerUserId, hostId: this.deps.hostId });
    void this.verification.refresh(records);
    return records.map((account) => toAgentAccountView(account, this.deps.home));
  }

  async verify(ownerUserId: string, input: { id: string }): Promise<AgentAccountView> {
    const account = await this.requireOwned(ownerUserId, input.id);
    return toAgentAccountView(await this.verification.verify(account), this.deps.home);
  }

  async remove(ownerUserId: string, input: { id: string }) {
    const account = await this.requireOwned(ownerUserId, input.id);
    return this.removal.remove(account);
  }

  async create(ownerUserId: string, input: { provider: AgentAccountProvider; label: string }): Promise<AgentAccountView> {
    const label = normalizeAgentAccountLabel(input.label);
    const account = await this.insert({ ownerUserId, provider: input.provider, label });
    await this.deps.home.ensure(account);
    this.log(`[accounts] created account=${account.id}`);
    return toAgentAccountView(account, this.deps.home);
  }

  async rename(ownerUserId: string, input: { id: string; label: string; version: number }): Promise<AgentAccountView> {
    const account = await this.requireOwned(ownerUserId, input.id);
    const label = normalizeAgentAccountLabel(input.label);
    const renamed = await this.renameRecord({ id: account.id, label, version: input.version }, account.provider);
    if (!renamed) throw new AgentAccountError("stale", "A conta mudou desde que você abriu a página.");
    return toAgentAccountView(renamed, this.deps.home);
  }

  async requireOwned(ownerUserId: string, id: string) {
    const account = await this.deps.accounts.findById(id);
    if (!account || account.ownerUserId !== ownerUserId || account.hostId !== this.deps.hostId || account.removedAt) throw new AgentAccountError("not_found", ACCOUNT_NOT_FOUND_MESSAGE);
    return account;
  }

  private async insert(input: { ownerUserId: string; provider: AgentAccountProvider; label: string }) {
    try { return await this.deps.accounts.insert({ ...input, hostId: this.deps.hostId }); }
    catch (error) {
      if (error instanceof AgentAccountLabelTaken) throw new AgentAccountError("label_taken", duplicateLabelMessage(input.provider));
      throw error;
    }
  }

  private async renameRecord(input: { id: string; label: string; version: number }, provider: AgentAccountProvider) {
    try { return await this.deps.accounts.rename(input); }
    catch (error) {
      if (error instanceof AgentAccountLabelTaken) throw new AgentAccountError("label_taken", duplicateLabelMessage(provider));
      throw error;
    }
  }
}
