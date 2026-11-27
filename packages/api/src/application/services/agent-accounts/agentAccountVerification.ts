import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import type { AgentLoginInspector } from "../../agent-accounts/agentLoginInspector";
import type { AgentAccountRecord, AgentAccountStatus } from "../../agent-accounts/agentAccountTypes";
import type { CodexCatalogProbe } from "../../terminal/codexCatalogProbe";
import { ACCOUNT_NOT_FOUND_MESSAGE, AgentAccountError } from "./agentAccountErrors";

const MAX_CONCURRENT_CHECKS = 4;
const LOGGED_IN = "logged_in";
const CODEX_PROVIDER = "codex";

export function verifiedStatus(current: AgentAccountStatus, inspected: "logged_in" | "logged_out" | "check_failed"): AgentAccountStatus {
  if (inspected === "logged_in") return "logged_in";
  if (inspected === "check_failed") return "check_failed";
  return current === "pending_login" ? "pending_login" : "logged_out";
}

export class AgentAccountVerification {
  constructor(private readonly deps: { accounts: AgentAccountDao; home: AgentAccountHome; inspector: AgentLoginInspector; codexProbe?: CodexCatalogProbe; now?: () => Date; log?: (message: string) => void }) {}

  async verify(account: AgentAccountRecord) {
    const home = await this.deps.home.ensure(account);
    const inspection = await this.deps.inspector.inspect({ provider: account.provider, home });
    const status = verifiedStatus(account.status, inspection.status);
    const codexCatalog = await this.freshCodexCatalog(account, home, status);
    const saved = await this.deps.accounts.saveCheck({ id: account.id, status, identity: account.provider === "claude" ? inspection.identity : null, plan: account.provider === "claude" ? inspection.plan : null, codexCatalog, checkedAt: (this.deps.now ?? (() => new Date()))() });
    if (!saved) throw new AgentAccountError("not_found", ACCOUNT_NOT_FOUND_MESSAGE);
    (this.deps.log ?? console.info)(`[accounts] verified account=${account.id} status=${saved.status}`);
    return saved;
  }

  async refresh(accounts: AgentAccountRecord[]) {
    let cursor = 0;
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_CHECKS, accounts.length) }, async () => {
      while (cursor < accounts.length) {
        const account = accounts[cursor++];
        if (account) await this.verifyQuietly(account);
      }
    });
    await Promise.all(workers);
  }

  private async freshCodexCatalog(account: AgentAccountRecord, home: string, status: AgentAccountStatus) {
    if (account.provider !== CODEX_PROVIDER || status !== LOGGED_IN || !this.deps.codexProbe) return undefined;
    if (account.status === LOGGED_IN && account.codexCatalog) return undefined;
    try { return await this.deps.codexProbe.read({ codexHome: home }); }
    catch { return undefined; }
  }

  private async verifyQuietly(account: AgentAccountRecord) {
    try { await this.verify(account); }
    catch { (this.deps.log ?? console.info)(`[accounts] verify_failed account=${account.id}`); }
  }
}
