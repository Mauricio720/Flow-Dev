import type { TerminalSessionDao, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { ClaudeSessionRuntime } from "../../terminal/claudeSessionRuntime";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import type { SessionHandlerFactory } from "./sessionHandlers";
import type { SessionLog } from "./sessionLog";

export const MISSING_PROMPT_REASON = "O prompt da sessão não foi encontrado.";

export type StarterDeps = {
  sessions: Pick<TerminalSessionDao, "markLaunchFailed">;
  context: Pick<SessionContextBuilder, "readPrompt" | "pathsOf">;
  runtime: ClaudeSessionRuntime;
  handlers: SessionHandlerFactory;
  registry: SessionHandleRegistry;
  log: SessionLog;
};

export class SessionStarter {
  constructor(private readonly deps: StarterDeps) {}

  async start(session: TerminalSessionRecord) {
    const prompt = await this.deps.context.readPrompt(session.id);
    if (prompt === null) return this.fail(session, MISSING_PROMPT_REASON);
    try {
      const contextDir = this.deps.context.pathsOf(session.id).contextDir;
      const handle = this.deps.runtime.start({ sessionId: session.id, cwd: session.checkoutPath, prompt, contextDir, permissionMode: session.permissionMode, handlers: this.deps.handlers.handlersFor(session) });
      this.deps.registry.set(session.id, handle);
      this.deps.log.info("started", { sessionId: session.id, taskId: session.taskId, mode: session.permissionMode });
    } catch (error) {
      await this.fail(session, error instanceof Error ? error.message : String(error));
    }
  }

  private async fail(session: TerminalSessionRecord, reason: string) {
    await this.deps.sessions.markLaunchFailed(session.id, reason);
    this.deps.log.error("launch_failed", { sessionId: session.id, reason });
  }
}
