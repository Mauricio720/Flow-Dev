import { BoardBackfillService } from "../application/services/projects/boardBackfillService";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { oauthClient, tokenCipher } from "../infra/composition";
import { requireDatabase, sql } from "../infra/database/client";
import { DrizzleAccessDao } from "../infra/database/dao/drizzleAccessDao";
import { DrizzleRepositoryAuthorizationStore } from "../infra/database/dao/drizzleRepositoryAuthorizationStore";
import { DrizzleProjectDao } from "../infra/database/dao/projects/drizzleProjectDao";
import { DrizzlePublishedIssueDao } from "../infra/database/dao/tasks/drizzlePublishedIssueDao";
import { GitHubHttpProjectBoardGateway } from "../infra/github/githubProjectBoardGateway";

const USAGE = "Usage: board:backfill --project-id <project UUID> --user-id <admin UUID> [--apply]";

function argument(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function main() {
  const projectId = argument("--project-id");
  const userId = argument("--user-id");
  if (!projectId || !userId) throw new Error(USAGE);
  const database = requireDatabase();
  const cipher = tokenCipher();
  const authorization = new RepositoryAuthorizationService(new DrizzleRepositoryAuthorizationStore(database, cipher), oauthClient(), cipher);
  const service = new BoardBackfillService({ projects: new DrizzleProjectDao(database), permissions: new DrizzleAccessDao(database), issues: new DrizzlePublishedIssueDao(database), authorization, boards: new GitHubHttpProjectBoardGateway() });
  return service.run({ projectId, userId, apply: process.argv.includes("--apply") });
}
try { console.log(JSON.stringify(await main(), null, 2)); } finally { await sql?.end(); }
