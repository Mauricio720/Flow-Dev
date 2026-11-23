import type { SessionControlAuthorization } from "../application/services/terminal/sessionControlAuthorization";
import { MAX_USER_MESSAGE_LENGTH } from "../application/services/terminal/sessionInteractionLimits";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionControlDao, SessionMessageDao, SessionMessageRecord } from "../application/terminal/sessionInteractionPorts";
import type { SessionPrincipal } from "../context";

type SessionScope = { projectId: string; taskId: string; sessionId: string };
type SendInput = SessionScope & { content: string; requestKey: string };

export type SessionInteractionDeps = { control: SessionControlAuthorization; messages: SessionMessageDao; controls: SessionControlDao; now?: () => Date };

export function toMessageView(message: SessionMessageRecord) {
  return { id: message.id, role: message.role, content: message.content, truncated: message.truncated, queued: message.role === "user" && message.deliveredAt === null && !message.undelivered, undelivered: message.undelivered, at: message.occurredAt.toISOString() };
}

export class SessionInteractionController {
  constructor(private readonly deps: SessionInteractionDeps) {}

  async send(actor: SessionPrincipal, input: SendInput) {
    await this.deps.control.requireOwnActive({ ...input, actorId: actor.userId });
    if (input.content.trim().length === 0 || input.content.length > MAX_USER_MESSAGE_LENGTH) throw new TaskError("message_invalid");
    const stored = await this.deps.messages.insertUserMessage({ sessionId: input.sessionId, content: input.content, requestKey: input.requestKey });
    return { message: toMessageView(stored.message) };
  }

  async interrupt(actor: SessionPrincipal, input: SessionScope) {
    await this.deps.control.requireOwnActive({ ...input, actorId: actor.userId });
    const requestedAt = this.now();
    if (!(await this.deps.controls.requestInterrupt(input.sessionId, requestedAt))) throw new TaskError("session_not_active");
    return { requestedAt: requestedAt.toISOString() };
  }

  async end(actor: SessionPrincipal, input: SessionScope) {
    await this.deps.control.requireOwnActive({ ...input, actorId: actor.userId });
    const requestedAt = this.now();
    if (!(await this.deps.controls.requestEnd(input.sessionId, requestedAt))) throw new TaskError("session_not_active");
    return { requestedAt: requestedAt.toISOString() };
  }

  private now() {
    return (this.deps.now ?? (() => new Date()))();
  }
}
