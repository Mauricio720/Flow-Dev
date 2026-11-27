import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import type { AgentAccountRecord } from "../../agent-accounts/agentAccountTypes";
import type { CodexCatalogProbe } from "../../terminal/codexCatalogProbe";
import type { CodexStatus } from "../../terminal/codexCatalog";
import { CODEX_EMPTY, CODEX_LOGIN } from "./codexCatalogRules";

export async function refreshCodexAccountCatalogs(input: { accounts: AgentAccountDao; home: AgentAccountHome; probe: CodexCatalogProbe; hostId: string; now: () => Date }) {
  const accounts = await input.accounts.listLoggedInCodex(input.hostId);
  for (const account of accounts) await refreshAccountSafely(input, account);
}

async function refreshAccountSafely(input: { accounts: AgentAccountDao; home: AgentAccountHome; probe: CodexCatalogProbe; hostId: string; now: () => Date }, account: AgentAccountRecord) {
  try { await refreshAccount(input, account); } catch {}
}

async function refreshAccount(input: { accounts: AgentAccountDao; home: AgentAccountHome; probe: CodexCatalogProbe; now: () => Date }, account: AgentAccountRecord) {
  let catalog: CodexStatus;
  try {
    const home = input.home.pathOf(account);
    catalog = await input.probe.read({ codexHome: home });
  } catch {
    catalog = { available: false, reason: "Não foi possível consultar o catálogo do Codex.", version: null, models: [], refreshedAt: input.now().toISOString() };
  }
  const status = accountStatus(catalog);
  await input.accounts.saveCheck({ id: account.id, status, identity: account.identity, plan: account.plan, codexCatalog: catalog, checkedAt: input.now() });
}

function accountStatus(catalog: CodexStatus): AgentAccountRecord["status"] {
  if (catalog.reason === CODEX_LOGIN) return "logged_out";
  if (catalog.available || catalog.reason === CODEX_EMPTY) return "logged_in";
  return "check_failed";
}
