import { LocalCheckoutService } from "../application/services/projects/localCheckoutService";
import { TerminalAttachmentService } from "../application/services/terminal/terminalAttachmentService";
import { SessionAttachmentDelivery } from "../application/services/terminal/sessionAttachmentDelivery";
import { IssueImageSelector } from "../application/services/terminal/issueImageSelector";
import { ConsoleTerminalLog } from "../application/services/terminal/terminalLaunchLog";
import { HeartbeatSessionServiceStatus } from "../application/services/terminal/sessionServiceStatus";
import { TerminalOpenGuard } from "../application/services/terminal/terminalOpenGuard";
import type { SessionContextBuilder } from "../application/terminal/sessionContext";
import type { ToolLocator } from "../application/terminal/toolLocator";
import { ConsolePlanLog } from "../application/services/tasks-set/planLog";
import { TaskSetLoader } from "../application/services/tasks-set/taskSetLoader";
import { SessionPurposeResolver } from "../application/services/terminal/sessionPurpose";
import type { SessionAgent } from "../application/terminal/sessionAgentCatalog";
import { TerminalSessionController } from "../controllers/terminalSessionController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleTaskSetReadDao } from "./database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleExecutionPlanDao } from "./database/dao/plans/drizzleExecutionPlanDao";
import { REGISTERED_SESSION_AGENTS } from "./registeredSessionAgents";
import { DrizzleLocalCheckoutDao } from "./database/dao/projects/drizzleLocalCheckoutDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleSessionHostDao } from "./database/dao/terminal/drizzleSessionHostDao";
import { DrizzleTerminalAttachmentDao } from "./database/dao/terminal/drizzleTerminalAttachmentDao";
import { DrizzleTerminalIssueImageDao } from "./database/dao/terminal/drizzleTerminalIssueImageDao";
import { DrizzleTerminalSessionDao } from "./database/dao/terminal/drizzleTerminalSessionDao";
import { DiskAttachmentFileStore } from "./terminal/diskAttachmentFileStore";
import { FileSessionContextBuilder } from "./terminal/fileSessionContextBuilder";
import { ExecGitCheckoutInspector } from "./terminal/execGitCheckoutInspector";
import { terminalPorts } from "./terminal/terminalPorts";
import { machineIdentity } from "./terminal/machineIdentity";
import type { CodexCatalogProbe } from "../application/terminal/codexCatalogProbe";

type Database = ReturnType<typeof requireDatabase>;
export type TerminalOverrides = { tools?: ToolLocator; context?: SessionContextBuilder; env?: NodeJS.ProcessEnv; now?: () => Date; hostId?: string; workAuthorization?: ReturnType<typeof createWorkAuthorization>; agents?: ReadonlySet<SessionAgent>; codexProbe?: CodexCatalogProbe };

export function createTerminalController(database: Database, overrides: TerminalOverrides = {}) {
  const env = overrides.env ?? process.env;
  const projects = new DrizzleProjectDao(database);
  const checkouts = new DrizzleLocalCheckoutDao(database);
  const verifier = new LocalCheckoutService({ checkouts, inspector: new ExecGitCheckoutInspector(), projects, permissions: new DrizzleAccessDao(database) });
  const ports = terminalPorts(env);
  const context = overrides.context ?? new FileSessionContextBuilder(env);
  const log = new ConsoleTerminalLog();
  const hostId = overrides.hostId ?? machineIdentity();
  const service = new HeartbeatSessionServiceStatus({ hosts: new DrizzleSessionHostDao(database), hostId, now: overrides.now ?? (() => new Date()) });
  const guard = new TerminalOpenGuard({ env, checkouts, verifier, tools: overrides.tools ?? ports.tools, context, service, log, codexProbe: overrides.codexProbe });
  const issueImages = new IssueImageSelector(new DrizzleTerminalIssueImageDao(database));
  const attachments = new DrizzleTerminalAttachmentDao(database);
  const files = new DiskAttachmentFileStore(env);
  const delivery = new SessionAttachmentDelivery({ attachments, issueImages, files });
  const sessions = new DrizzleTerminalSessionDao(database);
  const authorization = overrides.workAuthorization ?? createWorkAuthorization(database);
  const purposes = createPurposeResolver(database, overrides);
  return new TerminalSessionController({ authorization, sessions, purposes, projects, guard, issueImages, delivery, cleanup: new TerminalAttachmentService({ authorization, plannings: sessions, attachments, files, log }), context, hostId, log });
}

function createPurposeResolver(database: Database, overrides: TerminalOverrides) {
  const taskSets = new DrizzleTaskSetReadDao(database);
  const log = new ConsolePlanLog();
  const hostId = overrides.hostId ?? machineIdentity();
  const catalog = new HeartbeatSessionServiceStatus({ hosts: new DrizzleSessionHostDao(database), hostId, now: overrides.now ?? (() => new Date()) });
  return new SessionPurposeResolver({ specs: taskSets, loader: new TaskSetLoader(taskSets, log), plans: new DrizzleExecutionPlanDao(database), agents: overrides.agents ?? REGISTERED_SESSION_AGENTS, catalog, log, now: overrides.now ?? (() => new Date()) });
}

export function createProductionTerminalController() {
  return createTerminalController(requireDatabase());
}
