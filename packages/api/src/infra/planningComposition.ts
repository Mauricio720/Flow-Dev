import { PlanningService } from "../application/services/tasks/planningService";
import { TaskPlanningController } from "../controllers/taskPlanningController";
import { TaskPlanningWorkerController } from "../controllers/taskPlanningWorkerController";
import { requireDatabase } from "./database/client";
import { DrizzleTaskPlanningDao } from "./database/dao/tasks/drizzleTaskPlanningDao";
import { DrizzleTaskPlanningWorkerDao } from "./database/dao/tasks/drizzleTaskPlanningWorkerDao";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { DevControlPlanningGateway } from "./planning/devControlPlanningGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

export function createProductionTaskPlanningController() {
  const database = requireDatabase();
  return new TaskPlanningController(new PlanningService(new DrizzleTaskPlanningDao(database)), createWorkAuthorization(database));
}

export function createPlanningWorkerController(database: ReturnType<typeof requireDatabase>) {
  return new TaskPlanningWorkerController(new DrizzleTaskPlanningWorkerDao(database), createRepositoryAccessService(database), new DevControlPlanningGateway(), undefined, undefined, createWorkAuthorization(database));
}
