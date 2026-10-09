import { PlanningService } from "../application/services/tasks/planningService";
import { TaskPlanningController } from "../controllers/taskPlanningController";
import { TaskPlanningWorkerController } from "../controllers/taskPlanningWorkerController";
import { requireDatabase } from "./database/client";
import { DrizzleTaskPlanningDao } from "./database/dao/tasks/drizzleTaskPlanningDao";
import { DrizzleTaskPlanningWorkerDao } from "./database/dao/tasks/drizzleTaskPlanningWorkerDao";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { DevControlPlanningGateway } from "./planning/devControlPlanningGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { createGitRunner } from "./spec/workspace/gitRunner";
import { GitSpecWorkspaceGateway } from "./spec/workspace/gitWorkspaceGateway";
import { GitHubHttpRepositoryGateway } from "./github/githubRepositoryGateway";
import { PlanningWorkspaceProvisioner } from "./planning/planningWorkspaceProvisioner";
import { createSoftwareRuntime } from "./softwareComposition";

const GITHUB_REMOTE_BASE = "https://github.com";
const MAX_CHECKOUT_BYTES = 5 * 1024 ** 3;
const FETCH_TIMEOUT_MS = 120_000;

export function createProductionTaskPlanningController() {
  const database = requireDatabase();
  return new TaskPlanningController(new PlanningService(new DrizzleTaskPlanningDao(database)), createWorkAuthorization(database));
}

export function createPlanningWorkerController(database: ReturnType<typeof requireDatabase>, environment: NodeJS.ProcessEnv = process.env) {
  const repositories = createRepositoryAccessService(database);
  const github = new GitHubHttpRepositoryGateway();
  const root = environment.SPEC_WORKSPACE_ROOT?.trim() ?? "";
  const workspaces = new GitSpecWorkspaceGateway({ root, remoteBase: GITHUB_REMOTE_BASE, git: createGitRunner(), maxCheckoutBytes: MAX_CHECKOUT_BYTES, fetchTimeoutMs: FETCH_TIMEOUT_MS, resolveIdentity: (repository, credential) => github.resolvePath(credential.password, repository.owner, repository.name) });
  const workspaceProvisioner = new PlanningWorkspaceProvisioner({ repositories, workspaces, gateway: createSoftwareRuntime(environment).gateway, workspaceRoot: root });
  return new TaskPlanningWorkerController(new DrizzleTaskPlanningWorkerDao(database), repositories, new DevControlPlanningGateway(), undefined, undefined, createWorkAuthorization(database), workspaceProvisioner);
}
