import { LocalCheckoutService } from "../application/services/projects/localCheckoutService";
import { TerminalAttachmentService } from "../application/services/terminal/terminalAttachmentService";
import { SessionAttachmentDelivery } from "../application/services/terminal/sessionAttachmentDelivery";
import { IssueImageSelector } from "../application/services/terminal/issueImageSelector";
import { ConsoleTerminalLog } from "../application/services/terminal/terminalLaunchLog";
import { TerminalOpenGuard } from "../application/services/terminal/terminalOpenGuard";
import type { SessionContextBuilder } from "../application/terminal/sessionContext";
import type { TerminalLauncher, ToolLocator } from "../application/terminal/terminalLauncher";
import { TerminalSessionController } from "../controllers/terminalSessionController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleLocalCheckoutDao } from "./database/dao/projects/drizzleLocalCheckoutDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleTerminalAttachmentDao } from "./database/dao/terminal/drizzleTerminalAttachmentDao";
import { DrizzleTerminalIssueImageDao } from "./database/dao/terminal/drizzleTerminalIssueImageDao";
import { DrizzleTerminalSessionDao } from "./database/dao/terminal/drizzleTerminalSessionDao";
import { DiskAttachmentFileStore } from "./terminal/diskAttachmentFileStore";
import { FileSessionContextBuilder } from "./terminal/fileSessionContextBuilder";
import { ExecGitCheckoutInspector } from "./terminal/execGitCheckoutInspector";
import { terminalPorts } from "./terminal/terminalPorts";
import { buildTerminalCommand } from "./terminal/terminalCommand";

type Database = ReturnType<typeof requireDatabase>;
export type TerminalOverrides = { launcher?: TerminalLauncher; tools?: ToolLocator; context?: SessionContextBuilder; env?: NodeJS.ProcessEnv; workAuthorization?: ReturnType<typeof createWorkAuthorization> };

export function createTerminalController(database: Database, overrides: TerminalOverrides = {}) {
  const env = overrides.env ?? process.env;
  const projects = new DrizzleProjectDao(database);
  const checkouts = new DrizzleLocalCheckoutDao(database);
  const verifier = new LocalCheckoutService({ checkouts, inspector: new ExecGitCheckoutInspector(), projects, permissions: new DrizzleAccessDao(database) });
  const ports = terminalPorts(env);
  const context = overrides.context ?? new FileSessionContextBuilder(env);
  const log = new ConsoleTerminalLog();
  const guard = new TerminalOpenGuard({ env, checkouts, verifier, tools: overrides.tools ?? ports.tools, context, log });
  const issueImages = new IssueImageSelector(new DrizzleTerminalIssueImageDao(database));
  const attachments = new DrizzleTerminalAttachmentDao(database);
  const files = new DiskAttachmentFileStore(env);
  const delivery = new SessionAttachmentDelivery({ attachments, issueImages, files });
  const sessions = new DrizzleTerminalSessionDao(database);
  const authorization = overrides.workAuthorization ?? createWorkAuthorization(database);
  return new TerminalSessionController({ authorization, sessions, projects, guard, issueImages, delivery, cleanup: new TerminalAttachmentService({ authorization, plannings: sessions, attachments, files, log }), context, launcher: overrides.launcher ?? ports.launcher, buildCommand: buildTerminalCommand, log });
}

export function createProductionTerminalController() {
  return createTerminalController(requireDatabase());
}
