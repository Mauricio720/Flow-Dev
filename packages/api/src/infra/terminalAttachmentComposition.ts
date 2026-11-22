import { TerminalAttachmentService } from "../application/services/terminal/terminalAttachmentService";
import { ConsoleTerminalLog } from "../application/services/terminal/terminalLaunchLog";
import type { AttachmentFileStore } from "../application/terminal/attachmentFileStore";
import { TerminalAttachmentController } from "../controllers/terminalAttachmentController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import { DrizzleTerminalAttachmentDao } from "./database/dao/terminal/drizzleTerminalAttachmentDao";
import { DrizzleTerminalSessionDao } from "./database/dao/terminal/drizzleTerminalSessionDao";
import { DiskAttachmentFileStore } from "./terminal/diskAttachmentFileStore";

type Database = ReturnType<typeof requireDatabase>;
export type AttachmentOverrides = { files?: AttachmentFileStore; env?: NodeJS.ProcessEnv; workAuthorization?: ReturnType<typeof createWorkAuthorization> };

export function createTerminalAttachmentService(database: Database, overrides: AttachmentOverrides = {}) {
  return new TerminalAttachmentService({
    authorization: overrides.workAuthorization ?? createWorkAuthorization(database),
    plannings: new DrizzleTerminalSessionDao(database),
    attachments: new DrizzleTerminalAttachmentDao(database),
    files: overrides.files ?? new DiskAttachmentFileStore(overrides.env),
    log: new ConsoleTerminalLog(),
  });
}

export function createProductionTerminalAttachmentController() {
  return new TerminalAttachmentController(createTerminalAttachmentService(requireDatabase()));
}
