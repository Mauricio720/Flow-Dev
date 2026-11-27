import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { LocalCheckoutService } from "../application/services/projects/localCheckoutService";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { HeartbeatSessionServiceStatus, type SessionCatalogStatus } from "../application/services/terminal/sessionServiceStatus";
import { TerminalOpenGuard } from "../application/services/terminal/terminalOpenGuard";
import { ConsoleTerminalLog } from "../application/services/terminal/terminalLaunchLog";
import { PublishedCodexCatalog } from "../application/services/terminal/publishedCodexCatalog";
import { TaskSetLoader } from "../application/services/tasks-set/taskSetLoader";
import type { SessionContextBuilder } from "../application/terminal/sessionContext";
import type { SessionAgent } from "../application/terminal/sessionAgentCatalog";
import type { ToolLocator } from "../application/terminal/toolLocator";
import { ReviewCycleController } from "../controllers/reviewCycleController";
import { ReviewCycleService } from "../application/services/review/reviewCycleService";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleTaskSetReadDao } from "./database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleReviewCycleDao } from "./database/dao/review/drizzleReviewCycleDao";
import { DrizzleTerminalExecutionDao } from "./database/dao/terminal/drizzleTerminalExecutionDao";
import { DrizzleLocalCheckoutDao } from "./database/dao/projects/drizzleLocalCheckoutDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleSessionHostDao } from "./database/dao/terminal/drizzleSessionHostDao";
import { REGISTERED_SESSION_AGENTS } from "./registeredSessionAgents";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { ExecGitCheckoutInspector } from "./terminal/execGitCheckoutInspector";
import { FileSessionContextBuilder } from "./terminal/fileSessionContextBuilder";
import { terminalPorts } from "./terminal/terminalPorts";
import { machineIdentity } from "./terminal/machineIdentity";
import type { Database } from "./database/client";
import { DrizzleAgentAccountDao } from "./database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTaskAgentAccountDao } from "./database/dao/agent-accounts/drizzleTaskAgentAccountDao";
import { FileAgentAccountHome } from "./agents/fileAgentAccountHome";

type ReviewOverrides = { repositories?: Pick<RepositoryAccessService, "requireRead">; authorization?: Pick<WorkAuthorization, "requireOperate">; guard?: TerminalOpenGuard; catalog?: SessionCatalogStatus; agents?: ReadonlySet<SessionAgent>; hostId?: string; now?: () => Date; env?: NodeJS.ProcessEnv; context?: SessionContextBuilder; tools?: ToolLocator };

export function createReviewController(database: Database, overrides: ReviewOverrides = {}) {
  const env = overrides.env ?? process.env;
  const hostId = overrides.hostId ?? machineIdentity();
  const now = overrides.now ?? (() => new Date());
  const taskSets = new DrizzleTaskSetReadDao(database);
  const projects = new DrizzleProjectDao(database);
  const checkouts = new DrizzleLocalCheckoutDao(database);
  const catalog = overrides.catalog ?? new HeartbeatSessionServiceStatus({ hosts: new DrizzleSessionHostDao(database), hostId, now, choices: new DrizzleTaskAgentAccountDao(database), accounts: new DrizzleAgentAccountDao(database), home: new FileAgentAccountHome(env) });
  const guard = overrides.guard ?? createGuard({ database, env, context: overrides.context ?? new FileSessionContextBuilder(env), checkouts, projects, catalog, tools: overrides.tools ?? terminalPorts(env).tools, now });
  const service = new ReviewCycleService({ cycles: new DrizzleReviewCycleDao(database), taskSets: new TaskSetLoader(taskSets), sessions: new DrizzleTerminalExecutionDao(database), projects, guard, agents: overrides.agents ?? REGISTERED_SESSION_AGENTS, catalog, hostId });
  return new ReviewCycleController({ service, repositories: overrides.repositories ?? createRepositoryAccessService(database), tasks: taskSets, authorization: overrides.authorization ?? createWorkAuthorization(database), now });
}

function createGuard(input: { database: Database; env: NodeJS.ProcessEnv; context: SessionContextBuilder; checkouts: DrizzleLocalCheckoutDao; projects: DrizzleProjectDao; catalog: SessionCatalogStatus; tools: ToolLocator; now: () => Date }) {
  const verifier = new LocalCheckoutService({ checkouts: input.checkouts, inspector: new ExecGitCheckoutInspector(), projects: input.projects, permissions: new DrizzleAccessDao(input.database) });
  const log = new ConsoleTerminalLog();
  return new TerminalOpenGuard({ env: input.env, checkouts: input.checkouts, verifier, tools: input.tools, context: input.context, service: input.catalog, log, codexProbe: new PublishedCodexCatalog(input.catalog, input.now) });
}

export function createProductionReviewController() {
  return createReviewController(requireDatabase());
}
