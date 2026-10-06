import { SpecLifecycleService } from "../application/services/spec/specLifecycleService";
import { TaskSpecController } from "../controllers/taskSpecController";
import { EnvironmentSpecAdmission } from "./spec/environmentAdmission";
import { requireDatabase } from "./database/client";
import { DrizzleTaskSpecDao } from "./database/dao/spec/drizzleTaskSpecDao";
import { DrizzleTaskDao } from "./database/dao/tasks/drizzleTaskDao";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

export function createProductionTaskSpecController() {
  const database = requireDatabase();
  const specs = new DrizzleTaskSpecDao(database);
  return new TaskSpecController(new DrizzleTaskDao(database), specs, new SpecLifecycleService(specs, new EnvironmentSpecAdmission(process.env)), createRepositoryAccessService(database));
}
