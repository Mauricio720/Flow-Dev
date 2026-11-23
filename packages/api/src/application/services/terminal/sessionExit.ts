import type { TerminalSessionDao, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { RuntimeExit } from "../../terminal/claudeSessionRuntime";
import type { SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import type { SessionStatusDao } from "../../terminal/sessionStatusPorts";
import type { RequestCancellation } from "./requestCancellation";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import type { SessionLog } from "./sessionLog";
import { interruptedAtNote } from "./sessionNotes";

export const LAUNCH_FAILURE_FALLBACK = "O Claude Code não conseguiu iniciar a sessão.";

export type ExitDeps = {
  sessions: Pick<TerminalSessionDao, "markLaunchFailed">;
  status: Pick<SessionStatusDao, "transition">;
  messages: Pick<SessionMessageDao, "insertSystemMessage">;
  cancellation: RequestCancellation;
  registry: SessionHandleRegistry;
  now: () => Date;
  log: SessionLog;
};

export class SessionExitHandling {
  constructor(private readonly deps: ExitDeps) {}

  async handle(session: TerminalSessionRecord, outcome: RuntimeExit) {
    this.deps.registry.delete(session.id);
    this.deps.log.info("exited", { sessionId: session.id, kind: outcome.kind });
    if (outcome.kind === "failed") await this.deps.sessions.markLaunchFailed(session.id, outcome.detail || LAUNCH_FAILURE_FALLBACK);
    if (outcome.kind === "crashed") await this.interrupt(session.id);
  }

  private async interrupt(sessionId: string) {
    await this.deps.cancellation.cancelAll(sessionId);
    await this.deps.status.transition(sessionId, "orphaned");
    await this.deps.messages.insertSystemMessage({ sessionId, content: interruptedAtNote(this.deps.now()), occurredAt: this.deps.now() });
  }
}
