import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { PlanRunService } from "../application/services/plan-run/planRunService";
import { HeartbeatSessionServiceStatus, type SessionCatalogStatus } from "../application/services/terminal/sessionServiceStatus";
import type { TerminalOpenGuard } from "../application/services/terminal/terminalOpenGuard";
import { ConsolePlanLog } from "../application/services/tasks-set/planLog";
import type { PlanLog } from "../application/services/tasks-set/planLog";
import { TaskSetLoader } from "../application/services/tasks-set/taskSetLoader";
import { PlanRunController } from "../controllers/planRunController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import type { Database } from "./database/client";
import { DrizzleTaskSetReadDao } from "./database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleExecutionPlanDao } from "./database/dao/plans/drizzleExecutionPlanDao";
import { DrizzlePlanRunDao } from "./database/dao/plans/drizzlePlanRunDao";
import { DrizzleLocalCheckoutDao } from "./database/dao/projects/drizzleLocalCheckoutDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleSessionHostDao } from "./database/dao/terminal/drizzleSessionHostDao";
import { createGuard } from "./reviewComposition";
import { FileSessionContextBuilder } from "./terminal/fileSessionContextBuilder";
import { machineIdentity } from "./terminal/machineIdentity";
import { terminalPorts } from "./terminal/terminalPorts";
import type { SessionContextBuilder } from "../application/terminal/sessionContext";
import type { ToolLocator } from "../application/terminal/toolLocator";

export type PlanRunOverrides = { guard?: TerminalOpenGuard; catalog?: SessionCatalogStatus; hostId?: string; now?: () => Date; env?: NodeJS.ProcessEnv; log?: PlanLog; context?: SessionContextBuilder; tools?: ToolLocator; authorization?: Pick<WorkAuthorization, "requireOperate"> };

export function createPlanRunService(database: Database, overrides: PlanRunOverrides = {}) {
  const env = overrides.env ?? process.env;
  const hostId = overrides.hostId ?? machineIdentity();
  const now = overrides.now ?? (() => new Date());
  const log = overrides.log ?? new ConsolePlanLog();
  const projects = new DrizzleProjectDao(database);
  const checkouts = new DrizzleLocalCheckoutDao(database);
  const catalog = overrides.catalog ?? new HeartbeatSessionServiceStatus({ hosts: new DrizzleSessionHostDao(database), hostId, now });
  const guard = overrides.guard ?? createGuard({ database, env, context: overrides.context ?? new FileSessionContextBuilder(env), checkouts, projects, catalog, tools: overrides.tools ?? terminalPorts(env).tools, now });
  const loader = new TaskSetLoader(new DrizzleTaskSetReadDao(database), log);
  return new PlanRunService({ plans: new DrizzleExecutionPlanDao(database), runs: new DrizzlePlanRunDao(database), loader, projects, guard, hostId, log });
}

export function createPlanRunController(database: Database, overrides: PlanRunOverrides = {}) {
  return new PlanRunController({ service: createPlanRunService(database, overrides), authorization: overrides.authorization ?? createWorkAuthorization(database) });
}

export function createProductionPlanRunController() {
  return createPlanRunController(requireDatabase());
}
