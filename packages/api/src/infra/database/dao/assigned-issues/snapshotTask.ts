import { eq } from "drizzle-orm";
import { taskIssueSnapshots, taskIssueSources } from "../../schema";
import type { Database } from "../../client";

export async function readSnapshotTask(database: Database, snapshotId: string) {
  const [row] = await database.select({ title: taskIssueSnapshots.title, bodyMarkdown: taskIssueSnapshots.bodyMarkdown, issueNumber: taskIssueSources.issueNumber }).from(taskIssueSnapshots).innerJoin(taskIssueSources, eq(taskIssueSources.id, taskIssueSnapshots.sourceId)).where(eq(taskIssueSnapshots.id, snapshotId)).limit(1);
  return row ?? null;
}
