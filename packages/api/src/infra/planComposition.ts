import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { ConsolePlanLog } from "../application/services/tasks-set/planLog";
import type { PlanLog } from "../application/services/tasks-set/planLog";
import { TaskSetLoader } from "../application/services/tasks-set/taskSetLoader";
import type { SessionAgent } from "../application/terminal/sessionAgentCatalog";
import { ExecutionPlanController } from "../controllers/executionPlanController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase } from "./database/client";
import { DrizzleTaskSetReadDao } from "./database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleIssueClaimDao } from "./database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleExecutionPlanDao } from "./database/dao/plans/drizzleExecutionPlanDao";
import { DrizzlePlanRunDao } from "./database/dao/plans/drizzlePlanRunDao";
import { REGISTERED_SESSION_AGENTS } from "./registeredSessionAgents";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { HeartbeatSessionServiceStatus } from "../application/services/terminal/sessionServiceStatus";
import { DrizzleSessionHostDao } from "./database/dao/terminal/drizzleSessionHostDao";
import { machineIdentity } from "./terminal/machineIdentity";

type Database = ReturnType<typeof requireDatabase>;
export type PlanOverrides = { repositories?: Pick<RepositoryAccessService, "requireRead">; workAuthorization?: Pick<WorkAuthorization, "requireOperate">; agents?: ReadonlySet<SessionAgent>; log?: PlanLog };

export function createPlanController(database: Database, overrides: PlanOverrides = {}) {
  const log = overrides.log ?? new ConsolePlanLog();
  const taskSets = new DrizzleTaskSetReadDao(database);
  return new ExecutionPlanController({
    plans: new DrizzleExecutionPlanDao(database),
    taskSets,
    loader: new TaskSetLoader(taskSets, log),
    repositories: overrides.repositories ?? createRepositoryAccessService(database),
    claims: new DrizzleIssueClaimDao(database),
    authorization: overrides.workAuthorization ?? createWorkAuthorization(database),
    agents: overrides.agents ?? REGISTERED_SESSION_AGENTS,
    catalog: new HeartbeatSessionServiceStatus({ hosts: new DrizzleSessionHostDao(database), hostId: machineIdentity(), now: () => new Date() }),
    runs: new DrizzlePlanRunDao(database),
    log,
  });
}

export function createProductionPlanController() {
  return createPlanController(requireDatabase());
}
