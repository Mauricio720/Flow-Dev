import { sql } from "drizzle-orm";
import type { Database } from "../../client";
import type { SourceIdentity } from "../../../../application/database/dao/issueSourceDao";

export async function lockIdentity(tx: Database, identity: SourceIdentity) {
  const key = `${identity.projectId}:${identity.repositoryId}:${identity.issueNodeId}`;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
}
