import { createHash, randomUUID } from "node:crypto";
import type { StageResult, TerminalAttachmentDao } from "../../database/dao/terminalAttachmentDao";
import type { TerminalSessionDao } from "../../database/dao/terminalSessionDao";
import type { AttachmentFileStore } from "../../terminal/attachmentFileStore";
import type { WorkAuthorization } from "../assigned-issues/workAuthorization";
import { TaskError } from "../tasks/taskErrors";
import { MAX_ATTACHMENT_NAME_LENGTH, classifyAttachment } from "./attachmentRules";
import { TerminalAttachmentError } from "./terminalAttachmentErrors";
import { cleanupTerminalFiles } from "./terminalCleanup";
import type { TerminalLog } from "./terminalLaunchLog";

type Actor = { userId: string };
type PersistInput = { userId: string; attachmentId: string; storedName: string; content: Uint8Array };
type UploadInput = { projectId: string; taskId: string; name: string; content: Uint8Array };
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;

export type TerminalAttachmentDeps = {
  authorization: Pick<WorkAuthorization, "requireOperate">;
  plannings: Pick<TerminalSessionDao, "approvedPlanning">;
  attachments: TerminalAttachmentDao;
  files: AttachmentFileStore;
  log: TerminalLog;
};

function stageFailure(result: Exclude<StageResult, { id: string }>) {
  if (result === "duplicate") return new TerminalAttachmentError("attachment_duplicate");
  return new TerminalAttachmentError("attachment_limit", result === "limit_bytes" ? "total_size" : "count");
}

function displayName(name: string) {
  return name.replace(CONTROL_CHARACTERS, " ").trim().slice(0, MAX_ATTACHMENT_NAME_LENGTH) || "anexo";
}

export class TerminalAttachmentService {
  constructor(private readonly deps: TerminalAttachmentDeps) {}

  async upload(actor: Actor, input: UploadInput) {
    await this.deps.authorization.requireOperate({ projectId: input.projectId, taskId: input.taskId, actorId: actor.userId });
    if (!(await this.deps.plannings.approvedPlanning(input.taskId))) throw new TaskError("planning_not_approved");
    const verdict = classifyAttachment({ name: input.name, content: input.content });
    if (!verdict.ok) throw this.rejected(new TerminalAttachmentError(verdict.reason), input.content.byteLength);
    const storedName = randomUUID();
    const sha256 = createHash("sha256").update(input.content).digest("hex");
    const staged = await this.deps.attachments.stage({ taskId: input.taskId, userId: actor.userId, originalName: displayName(input.name), storedName, contentType: verdict.contentType, byteSize: input.content.byteLength, sha256 });
    if (typeof staged === "string") throw this.rejected(stageFailure(staged), input.content.byteLength);
    await this.persist({ userId: actor.userId, attachmentId: staged.id, storedName, content: input.content });
    return { id: staged.id, name: staged.originalName, contentType: staged.contentType, byteSize: staged.byteSize };
  }

  async remove(actor: Actor, attachmentId: string) {
    const removed = await this.deps.attachments.remove(actor.userId, attachmentId);
    if (!removed) throw new TerminalAttachmentError("attachment_missing");
    await this.deps.files.removeStaged(actor.userId, removed.storedName);
  }

  cleanup(now: Date) {
    return cleanupTerminalFiles({ attachments: this.deps.attachments, files: this.deps.files, log: this.deps.log }, now);
  }

  private async persist({ userId, attachmentId, storedName, content }: PersistInput) {
    try {
      await this.deps.files.writeStaged(userId, storedName, content);
    } catch (error) {
      await this.deps.attachments.remove(userId, attachmentId);
      throw error;
    }
  }

  private rejected(error: TerminalAttachmentError, size: number) {
    this.deps.log.attachmentRejected({ reason: error.reason, size });
    return error;
  }
}
