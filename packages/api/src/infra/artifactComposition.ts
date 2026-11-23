import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskArtifactController } from "../controllers/taskArtifactController";
import { requireDatabase } from "./database/client";
import { DrizzleArtifactReadDao } from "./database/dao/artifacts/drizzleArtifactReadDao";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

type Database = ReturnType<typeof requireDatabase>;

export function createArtifactController(database: Database, repositories: RepositoryAccessService = createRepositoryAccessService(database)) {
  return new TaskArtifactController(new DrizzleArtifactReadDao(database), repositories);
}

export function createProductionArtifactController() {
  return createArtifactController(requireDatabase());
}
