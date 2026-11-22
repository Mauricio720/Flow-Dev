import type { TerminalAttachmentService } from "../application/services/terminal/terminalAttachmentService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TerminalAttachmentError, attachmentFailureMessage } from "../application/services/terminal/terminalAttachmentErrors";
import type { SessionPrincipal } from "../context";
import { normalizeTaskError } from "./taskErrorMapper";

type UploadInput = { projectId: string; taskId: string; name: string; content: Uint8Array };
export type AttachmentFailure = { reason: string; message?: string };

export function attachmentFailureOf(error: unknown): AttachmentFailure {
  if (error instanceof TerminalAttachmentError) return { reason: error.reason, message: attachmentFailureMessage(error.reason, error.limitKind) };
  const reason = normalizeTaskError(error).reason;
  return { reason, message: attachmentFailureMessage(reason) };
}

export class TerminalAttachmentController {
  constructor(private readonly service: TerminalAttachmentService) {}

  async upload(actor: SessionPrincipal, input: UploadInput) {
    if (!actor.sessionId) throw new TaskError("session_required");
    return this.service.upload(actor, input);
  }

  async remove(actor: SessionPrincipal, attachmentId: string) {
    if (!actor.sessionId) throw new TaskError("session_required");
    await this.service.remove(actor, attachmentId);
  }
}
