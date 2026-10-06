import { ReadyPlacementService } from "../application/services/projects/readyPlacementService";
import { PlanningService } from "../application/services/tasks/planningService";
import { TaskPlanningController } from "../controllers/taskPlanningController";
import { TaskPlanningWorkerController } from "../controllers/taskPlanningWorkerController";
import { requireDatabase } from "./database/client";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleTaskDao } from "./database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskPlanningDao } from "./database/dao/tasks/drizzleTaskPlanningDao";
import { DrizzleTaskPlanningWorkerDao } from "./database/dao/tasks/drizzleTaskPlanningWorkerDao";
import { GitHubHttpProjectBoardGateway } from "./github/githubProjectBoardGateway";
import { DevControlPlanningGateway } from "./planning/devControlPlanningGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

export function createProductionTaskPlanningController() {
  const database = requireDatabase();
  const ready = new ReadyPlacementService(new DrizzleProjectDao(database), new GitHubHttpProjectBoardGateway());
  return new TaskPlanningController(new DrizzleTaskDao(database), new PlanningService(new DrizzleTaskPlanningDao(database)), createRepositoryAccessService(database), undefined, ready);
}

export function createPlanningWorkerController(database: ReturnType<typeof requireDatabase>) {
  return new TaskPlanningWorkerController(new DrizzleTaskPlanningWorkerDao(database), createRepositoryAccessService(database), new DevControlPlanningGateway());
}
