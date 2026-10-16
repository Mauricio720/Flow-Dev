import { IssueImagePublisher } from "../application/services/tasks/issueImagePublisher";
import { TaskImageController } from "../controllers/taskImageController";
import { requireDatabase } from "./database/client";
import { DrizzleTaskDao } from "./database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskImageDao } from "./database/dao/tasks/drizzleTaskImageDao";
import { GitHubHttpIssueImageStore } from "./github/githubIssueImageStore";
import { createRepositoryAccessService } from "./repositoryAccessFactory";

export function createProductionTaskImageController() {
  const database = requireDatabase();
  return new TaskImageController(new DrizzleTaskDao(database), new DrizzleTaskImageDao(database), createRepositoryAccessService(database));
}

export function createIssueImagePublisher(database: ReturnType<typeof requireDatabase>) {
  return new IssueImagePublisher(new DrizzleTaskImageDao(database), new GitHubHttpIssueImageStore());
}
