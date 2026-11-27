import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import type { AgentLoginInspector } from "../../agent-accounts/agentLoginInspector";
import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import { accountCheckFailed, accountLoggedOut, accountUnavailable } from "./sessionAccountMessages";

const LOGIN_CHECK_TIMEOUT_MS = 10_000;

export type SessionAccountCheck = { ok: true; credentialHome?: string; account: Awaited<ReturnType<AgentAccountDao["findById"]>> } | { ok: false; reason: string };

export class SessionAccountGate {
  constructor(private readonly deps: { accounts: Pick<AgentAccountDao, "findById">; home: AgentAccountHome; inspector: AgentLoginInspector; hostId: string; timeoutMs?: number }) {}

  async check(session: TerminalSessionRecord): Promise<SessionAccountCheck> {
    if (!session.agentAccountId) return { ok: true, account: null };
    try {
      const account = await this.deps.accounts.findById(session.agentAccountId);
      if (!account || !this.isUsable(account, session)) return { ok: false, reason: accountUnavailable() };
      return this.checkLogin(account);
    } catch {
      return { ok: false, reason: accountUnavailable() };
    }
  }

  private isUsable(account: Awaited<ReturnType<AgentAccountDao["findById"]>>, session: TerminalSessionRecord) {
    return account !== null && account.removedAt === null && account.ownerUserId === session.userId && account.hostId === this.deps.hostId && account.provider === session.agent;
  }

  private async checkLogin(account: NonNullable<Awaited<ReturnType<AgentAccountDao["findById"]>>>): Promise<SessionAccountCheck> {
    try {
      const home = await this.deps.home.ensure(account);
      const inspection = await withTimeout(this.deps.inspector.inspect({ provider: account.provider, home }), this.deps.timeoutMs ?? LOGIN_CHECK_TIMEOUT_MS);
      if (inspection.status === "logged_in") return { ok: true, credentialHome: home, account };
      return { ok: false, reason: inspection.status === "logged_out" ? accountLoggedOut(account, home) : accountCheckFailed(account.label) };
    } catch (error) {
      return { ok: false, reason: error instanceof AccountCheckTimeout ? accountCheckFailed(account.label) : accountUnavailable() };
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new AccountCheckTimeout()), timeoutMs); timer.unref?.(); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

class AccountCheckTimeout extends Error {}
