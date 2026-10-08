import { SpecLifecycleService } from "../application/services/spec/specLifecycleService";
import { TaskSpecController } from "../controllers/taskSpecController";
import { EnvironmentSpecAdmission } from "./spec/environmentAdmission";
import { requireDatabase } from "./database/client";
import { DrizzleTaskSpecDao } from "./database/dao/spec/drizzleTaskSpecDao";
import { createWorkAuthorization } from "./assignedIssuesComposition";

export function createProductionTaskSpecController() {
  const database = requireDatabase();
  const specs = new DrizzleTaskSpecDao(database);
  return new TaskSpecController(createWorkAuthorization(database), specs, new SpecLifecycleService(specs, new EnvironmentSpecAdmission(process.env)));
}
