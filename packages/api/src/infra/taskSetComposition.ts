import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskSetController } from "../controllers/taskSetController";
import { requireDatabase } from "./database/client";
import { DrizzleTaskSetReadDao } from "./database/dao/artifacts/drizzleTaskSetReadDao";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

type Database = ReturnType<typeof requireDatabase>;

export function createTaskSetController(database: Database, repositories: RepositoryAccessService = createRepositoryAccessService(database)) {
  return new TaskSetController(new DrizzleTaskSetReadDao(database), repositories);
}

export function createProductionTaskSetController() {
  return createTaskSetController(requireDatabase());
}
