import { and, eq } from "drizzle-orm";
import { taskIssueSources } from "../../schema";
import type { Database } from "../../client";
import type { IssueSourceDao, SourceFacts, SourceIdentity } from "../../../../application/database/dao/issueSourceDao";
import { resolveSource } from "./sourceBinding";
import { loadSource, sourceByIdentity } from "./sourceRecords";

export class DrizzleIssueSourceDao implements IssueSourceDao {
  constructor(private readonly database: Database) {}

  resolve(facts: SourceFacts) {
    return this.database.transaction((tx) => resolveSource(tx as unknown as Database, facts));
  }

  findByIdentity(identity: SourceIdentity) {
    return loadSource(this.database, sourceByIdentity(identity));
  }

  findByTask(projectId: string, taskId: string) {
    return loadSource(this.database, and(eq(taskIssueSources.projectId, projectId), eq(taskIssueSources.taskId, taskId)));
  }
}
