import type { TerminalSessionDao, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { SessionRuntimes } from "../../terminal/agentSessionRuntime";
import { AGENT_UNAVAILABLE_REASON } from "../../terminal/sessionAgentCatalog";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import type { SessionHandlerFactory } from "./sessionHandlers";
import type { SessionLog } from "./sessionLog";
import type { SessionAccountGate } from "./sessionAccountGate";
import { accountLogField } from "./sessionLog";

export const MISSING_PROMPT_REASON = "O prompt da sessão não foi encontrado.";
const ACCOUNT_REJECTED_LOG_REASON = "account_rejected";

export type StarterDeps = {
  sessions: Pick<TerminalSessionDao, "markLaunchFailed">;
  context: Pick<SessionContextBuilder, "readPrompt" | "pathsOf">;
  runtimes: SessionRuntimes;
  handlers: SessionHandlerFactory;
  registry: SessionHandleRegistry;
  log: SessionLog;
  accountGate?: SessionAccountGate;
};

export class SessionStarter {
  constructor(private readonly deps: StarterDeps) {}

  async start(session: TerminalSessionRecord) {
    const prompt = await this.deps.context.readPrompt(session.id);
    if (prompt === null) return this.fail(session, MISSING_PROMPT_REASON);
    const account = await this.deps.accountGate?.check(session);
    if (account && !account.ok) return this.fail(session, account.reason, ACCOUNT_REJECTED_LOG_REASON);
    const runtime = this.deps.runtimes[session.agent];
    if (!runtime) return this.fail(session, AGENT_UNAVAILABLE_REASON[session.agent]);
    try {
      const contextDir = this.deps.context.pathsOf(session.id).contextDir;
      const handle = runtime.start({ sessionId: session.id, cwd: session.checkoutPath, purpose: session.purpose, prompt, contextDir, permissionMode: session.permissionMode, credentialHome: account?.ok ? account.credentialHome : undefined, model: session.model ?? undefined, effort: session.effort ?? undefined, handlers: this.deps.handlers.handlersFor(session) });
      this.deps.registry.set(session.id, handle);
      this.deps.log.info("started", { sessionId: session.id, taskId: session.taskId, mode: session.permissionMode, agent: session.agent, model: session.model, effort: session.effort, ...accountLogField(session) });
    } catch (error) {
      await this.fail(session, error instanceof Error ? error.message : String(error));
    }
  }

  private async fail(session: TerminalSessionRecord, reason: string, logReason = reason) {
    await this.deps.sessions.markLaunchFailed(session.id, reason);
    this.deps.log.error("launch_failed", { sessionId: session.id, reason: logReason, ...accountLogField(session) });
  }
}
