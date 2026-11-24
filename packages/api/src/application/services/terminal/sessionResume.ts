import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { RuntimeExit, SessionRuntimes } from "../../terminal/agentSessionRuntime";
import { AGENT_UNAVAILABLE_REASON } from "../../terminal/sessionAgentCatalog";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import type { ClaimInput, SessionMessageDao, SessionMessageRecord } from "../../terminal/sessionInteractionPorts";
import type { SessionStatusDao } from "../../terminal/sessionStatusPorts";
import type { RequestCancellation } from "./requestCancellation";
import type { SessionExitHandling } from "./sessionExit";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import type { SessionHandlerFactory } from "./sessionHandlers";
import { errorFields, type SessionLog } from "./sessionLog";
import { RESUME_FAILED_NOTE, RESUME_FAILED_REASON } from "./sessionNotes";
import type { TickStep } from "./sessionTickStep";

export type ResumeDeps = {
  status: Pick<SessionStatusDao, "listInterrupted" | "claimResume" | "markEnded">;
  messages: Pick<SessionMessageDao, "listUndelivered" | "markDelivered" | "markUndelivered" | "insertSystemMessage">;
  runtimes: SessionRuntimes;
  handlers: SessionHandlerFactory;
  registry: SessionHandleRegistry;
  context: Pick<SessionContextBuilder, "pathsOf">;
  exit: SessionExitHandling;
  cancellation: RequestCancellation;
  identity: ClaimInput;
  now: () => Date;
  log: SessionLog;
};

export class SessionResumeStep implements TickStep {
  readonly name = "resume";

  constructor(private readonly deps: ResumeDeps) {}

  async run() {
    for (const session of await this.deps.status.listInterrupted(this.deps.identity.hostId)) {
      const queued = await this.deps.messages.listUndelivered(session.id);
      if (queued.length > 0) await this.resume(session, queued);
    }
  }

  private async resume(session: TerminalSessionRecord, queued: SessionMessageRecord[]) {
    if (!session.claudeSessionId) return this.fail(session.id, queued);
    const runtime = this.deps.runtimes[session.agent];
    if (!runtime) {
      this.deps.log.error("resume_failed", { sessionId: session.id, reason: AGENT_UNAVAILABLE_REASON[session.agent] });
      return this.fail(session.id, queued);
    }
    const claimed = await this.deps.status.claimResume({ sessionId: session.id, workerId: this.deps.identity.workerId });
    if (!claimed) return;
    try {
      const handlers = this.deps.handlers.handlersFor(claimed, (current, outcome) => this.onExit(current, outcome, queued));
      const contextDir = this.deps.context.pathsOf(session.id).contextDir;
      const choice = { model: session.model ?? undefined, effort: session.effort ?? undefined };
      this.deps.registry.set(session.id, runtime.resume({ sessionId: session.id, claudeSessionId: session.claudeSessionId, cwd: session.checkoutPath, contextDir, permissionMode: session.permissionMode, firstMessage: queued[0]!.content, handlers, ...choice }));
      await this.deps.messages.markDelivered([queued[0]!.id], this.deps.now());
      this.deps.log.info("resumed", { sessionId: session.id, agent: session.agent, model: session.model, effort: session.effort });
    } catch (error) {
      this.deps.log.error("resume_failed", { sessionId: session.id, ...errorFields(error) });
      await this.fail(session.id, queued);
    }
  }

  private async onExit(session: TerminalSessionRecord, outcome: RuntimeExit, queued: SessionMessageRecord[]) {
    if (outcome.kind !== "failed") return this.deps.exit.handle(session, outcome);
    this.deps.registry.delete(session.id);
    await this.fail(session.id, queued);
  }

  private async fail(sessionId: string, queued: SessionMessageRecord[]) {
    await this.deps.cancellation.cancelAll(sessionId);
    await this.deps.status.markEnded({ sessionId, reason: RESUME_FAILED_REASON, at: this.deps.now() });
    await this.deps.messages.insertSystemMessage({ sessionId, content: RESUME_FAILED_NOTE, occurredAt: this.deps.now() });
    await this.deps.messages.markUndelivered(queued.map((message) => message.id));
  }
}
