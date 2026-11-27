import type { SessionHostDao } from "../../terminal/sessionInteractionPorts";
import type { CodexStatus } from "../../terminal/codexCatalog";
import type { TaskAgentAccountDao } from "../../agent-accounts/taskAgentAccountDao";
import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import { loginCommandOf } from "../../agent-accounts/loginCommand";

export const SERVICE_HEARTBEAT_FRESH_MS = 15_000;

export interface SessionServiceStatus {
  running(): Promise<boolean>;
}

export interface SessionCatalogStatus extends SessionServiceStatus {
  codexStatus(taskId?: string): Promise<CodexStatus | null>;
}

export type SessionServiceStatusDeps = { hosts: SessionHostDao; hostId: string; now: () => Date; choices?: Pick<TaskAgentAccountDao, "choicesOf">; accounts?: Pick<AgentAccountDao, "findById">; home?: AgentAccountHome };

export class HeartbeatSessionServiceStatus implements SessionCatalogStatus {
  constructor(private readonly deps: SessionServiceStatusDeps) {}

  async running(): Promise<boolean> {
    const beat = await this.deps.hosts.lastBeat(this.deps.hostId);
    if (!beat) return false;
    return this.deps.now().getTime() - beat.heartbeatAt.getTime() < SERVICE_HEARTBEAT_FRESH_MS;
  }

  async codexStatus(taskId?: string): Promise<CodexStatus | null> {
    const choice = taskId && this.deps.choices ? (await this.deps.choices.choicesOf(taskId)).find((row) => row.provider === "codex") : undefined;
    if (!choice || !this.deps.accounts || !this.deps.home) return this.deps.hosts.codexStatus(this.deps.hostId);
    const account = await this.deps.accounts.findById(choice.accountId);
    if (!account || account.removedAt) return unavailableCatalog(`A conta ${choice.label} foi removida. Escolha outra conta para o Codex.`, this.deps.now());
    if (account.status === "logged_out" || account.status === "pending_login") return unavailableCatalog(`A conta ${account.label} (Codex) não está logada. Rode \`${loginCommandOf("codex", this.deps.home.pathOf(account))}\`.`, this.deps.now());
    if (account.status === "check_failed") return account.codexCatalog ?? unavailableCatalog(`Não foi possível verificar o catálogo da conta ${account.label}. Tente de novo.`, this.deps.now());
    return account.codexCatalog;
  }
}

function unavailableCatalog(reason: string, now: Date): CodexStatus {
  return { available: false, reason, version: null, models: [], refreshedAt: now.toISOString() };
}
