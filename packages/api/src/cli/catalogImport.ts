import { readFile } from "node:fs/promises";
import { CatalogImporter } from "../application/services/projects/catalogImporter";
import { CatalogVerifier } from "../application/services/projects/catalogVerifier";
import { requireDatabase, sql } from "../infra/database/client";
import { DrizzleProjectDao } from "../infra/database/dao/projects/drizzleProjectDao";
import { DrizzleAccessDao } from "../infra/database/dao/drizzleAccessDao";
import { DrizzleRepositoryAuthorizationStore } from "../infra/database/dao/drizzleRepositoryAuthorizationStore";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { GitHubHttpRepositoryGateway } from "../infra/github/githubRepositoryGateway";
import { oauthClient, tokenCipher } from "../infra/composition";
import { stageProjectBackfill } from "../infra/database/dao/projectBackfill";

function argument(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function main() {
  const file = argument("--file");
  const userId = argument("--user-id");
  if (!file || !userId) throw new Error("Usage: catalog:import --file <manifest.json> --user-id <admin UUID> [--backfill]");
  const database = requireDatabase();
  const cipher = tokenCipher();
  const authorization = new RepositoryAuthorizationService(new DrizzleRepositoryAuthorizationStore(database, cipher), oauthClient(), cipher);
  const verifier = new CatalogVerifier({ permissions: new DrizzleAccessDao(database), authorization, github: new GitHubHttpRepositoryGateway() });
  const manifest = JSON.parse(await readFile(file, "utf8"));
  if (process.argv.includes("--backfill")) {
    await stageProjectBackfill(database, await verifier.verify(userId, manifest));
    return { staged: manifest.length };
  }
  return new CatalogImporter(new DrizzleProjectDao(database), verifier).import(userId, manifest);
}
try { console.log(JSON.stringify(await main())); } finally { await sql?.end(); }
