import type { TerminalSessionDao, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { RuntimeExit } from "../../terminal/agentSessionRuntime";
import type { SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import type { SessionStatusDao } from "../../terminal/sessionStatusPorts";
import type { RequestCancellation } from "./requestCancellation";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import { accountLogField, type SessionLog } from "./sessionLog";
import { interruptedAtNote } from "./sessionNotes";
import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";

export const LAUNCH_FAILURE_FALLBACK = "O Claude Code não conseguiu iniciar a sessão.";
const DEFAULT_LOGIN_LIMIT_LABEL = "login padrão";

export type ExitDeps = {
  sessions: Pick<TerminalSessionDao, "markLaunchFailed">;
  status: Pick<SessionStatusDao, "transition">;
  messages: Pick<SessionMessageDao, "insertSystemMessage">;
  cancellation: RequestCancellation;
  registry: SessionHandleRegistry;
  now: () => Date;
  log: SessionLog;
  accounts?: Pick<AgentAccountDao, "findById">;
};

export class SessionExitHandling {
  constructor(private readonly deps: ExitDeps) {}

  async handle(session: TerminalSessionRecord, outcome: RuntimeExit) {
    this.deps.registry.delete(session.id);
    this.deps.log.info("exited", { sessionId: session.id, kind: outcome.kind, ...accountLogField(session) });
    if (outcome.kind === "failed") await this.deps.sessions.markLaunchFailed(session.id, outcome.limit ? await this.limitReason(session) : outcome.detail || LAUNCH_FAILURE_FALLBACK);
    if (outcome.kind === "crashed") await this.interrupt(session.id, outcome.limit ? await this.limitReason(session) : undefined);
  }

  private async interrupt(sessionId: string, note?: string) {
    await this.deps.cancellation.cancelAll(sessionId);
    await this.deps.status.transition(sessionId, "orphaned");
    await this.deps.messages.insertSystemMessage({ sessionId, content: note ?? interruptedAtNote(this.deps.now()), occurredAt: this.deps.now() });
  }

  private async limitReason(session: TerminalSessionRecord) {
    const account = session.agentAccountId ? await this.deps.accounts?.findById(session.agentAccountId) : null;
    return usageLimitReason(account?.label ?? DEFAULT_LOGIN_LIMIT_LABEL);
  }
}

export function usageLimitReason(label: string) {
  return `Limite de uso da conta ${label} atingido`;
}
