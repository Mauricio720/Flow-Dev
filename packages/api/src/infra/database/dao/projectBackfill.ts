import { sql } from "drizzle-orm";
import type { Database } from "../client";
import type { CatalogEntry } from "../../../application/services/projects/catalogVerifier";

export async function stageProjectBackfill(database: Database, entries: CatalogEntry[]) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM project_repository_backfill`);
    for (const entry of entries) {
      const repo = entry.repository;
      await tx.execute(sql`INSERT INTO project_repository_backfill
        (external_key, repository_owner, repository_name, github_repository_id, github_node_id, repository_visibility, repository_archived, verified_at)
        VALUES (${entry.externalKey}, ${repo.owner}, ${repo.name}, ${repo.githubId}, ${repo.nodeId}, ${repo.visibility}, ${repo.archived}, now())`);
    }
  });
}
