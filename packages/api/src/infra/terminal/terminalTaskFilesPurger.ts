import type { TerminalTaskFilesDao } from "../../application/database/dao/terminalAttachmentDao";
import type { TerminalFilesPurger } from "../../application/services/issue-deletion/deletionPorts";
import type { AttachmentFileStore } from "../../application/terminal/attachmentFileStore";

export class TerminalTaskFilesPurger implements TerminalFilesPurger {
  constructor(private readonly dao: TerminalTaskFilesDao, private readonly files: AttachmentFileStore) {}

  async purgeTask(taskId: string) {
    for (const sessionId of await this.dao.sessionIdsOfTask(taskId)) await this.files.removeSessionDir(sessionId);
    for (const staged of await this.dao.stagedFilesOfTask(taskId)) await this.files.removeStaged(staged.userId, staged.storedName);
  }
}
