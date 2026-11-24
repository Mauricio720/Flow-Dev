import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { RuntimeExit, RuntimeHandlers } from "../../terminal/agentSessionRuntime";
import { errorFields, type SessionLog } from "./sessionLog";
import type { SessionPermissions } from "./sessionPermissions";
import type { SessionRecorder } from "./sessionRecorder";
import { SerialQueue } from "./sessionSerialQueue";

export type SessionExitHandler = (session: TerminalSessionRecord, outcome: RuntimeExit) => Promise<void>;
export type HandlerFactoryDeps = { recorder: SessionRecorder; permissions: SessionPermissions; onExit: SessionExitHandler; onAgentVersion?: (sessionId: string, version: string) => Promise<void>; log: SessionLog };

export class SessionHandlerFactory {
  private readonly queues = new Map<string, SerialQueue>();

  constructor(private readonly deps: HandlerFactoryDeps) {}

  handlersFor(session: TerminalSessionRecord, onExit: SessionExitHandler = this.deps.onExit): RuntimeHandlers {
    const queue = this.queueOf(session.id);
    return {
      onAgentInfo: ({ version }) => { if (version) queue.enqueue(() => this.deps.onAgentVersion?.(session.id, version) ?? Promise.resolve()); },
      onAssistantText: (text) => queue.enqueue(() => this.deps.recorder.text(session.id, text)),
      onHook: (payload) => queue.enqueue(() => this.deps.recorder.hook(session.id, payload)),
      onPermission: async (request) => {
        await queue.flush();
        return this.deps.permissions.handle(session, request);
      },
      onExit: (outcome) => queue.enqueue(() => this.exit(onExit, session, outcome)),
    };
  }

  async flush() {
    await Promise.all([...this.queues.values()].map((queue) => queue.flush()));
  }

  private queueOf(sessionId: string) {
    const existing = this.queues.get(sessionId);
    if (existing) return existing;
    const created = new SerialQueue();
    this.queues.set(sessionId, created);
    return created;
  }

  private async exit(onExit: SessionExitHandler, session: TerminalSessionRecord, outcome: RuntimeExit) {
    try {
      await onExit(session, outcome);
    } catch (error) {
      this.deps.log.error("exit_failed", { sessionId: session.id, kind: outcome.kind, ...errorFields(error) });
    }
  }
}
