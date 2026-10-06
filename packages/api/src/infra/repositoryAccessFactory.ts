import { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import type { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { DrizzleRepositoryAuthorizationStore } from "./database/dao/drizzleRepositoryAuthorizationStore";
import { GitHubHttpRepositoryGateway } from "./github/githubRepositoryGateway";
import { oauthClient, tokenCipher } from "./composition";

export function createRepositoryAccessService(database: ReturnType<typeof requireDatabase>) {
  const projects = new DrizzleProjectDao(database);
  const access = new DrizzleAccessDao(database);
  const cipher = tokenCipher();
  const authorization = new RepositoryAuthorizationService(new DrizzleRepositoryAuthorizationStore(database, cipher), oauthClient(), cipher);
  return new RepositoryAccessService(projects, access, authorization, new GitHubHttpRepositoryGateway());
}
