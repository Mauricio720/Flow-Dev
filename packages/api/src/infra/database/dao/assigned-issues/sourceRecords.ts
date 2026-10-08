import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { taskIssueSnapshots, taskIssueSources } from "../../schema";
import type { Database } from "../../client";
import type { IssueOrigin, SourceRecord } from "../../../../application/database/dao/issueSourceDao";

type SourceRow = typeof taskIssueSources.$inferSelect;
type SnapshotRow = typeof taskIssueSnapshots.$inferSelect;

export async function loadSource(db: Database, where: SQL | undefined): Promise<SourceRecord | null> {
  const [row] = await db.select({ source: taskIssueSources, snapshot: taskIssueSnapshots }).from(taskIssueSources).innerJoin(taskIssueSnapshots, eq(taskIssueSnapshots.id, taskIssueSources.currentSnapshotId)).where(where).limit(1);
  return row ? mapSource(row.source, row.snapshot) : null;
}

export function sourceByIdentity(identity: { projectId: string; repositoryId: string; issueNodeId: string }) {
  return and(eq(taskIssueSources.projectId, identity.projectId), eq(taskIssueSources.repositoryId, identity.repositoryId), eq(taskIssueSources.issueNodeId, identity.issueNodeId));
}

export function mapSource(source: SourceRow, snapshot: SnapshotRow): SourceRecord {
  const identity = { projectId: source.projectId, repositoryId: source.repositoryId, repositoryNodeId: source.repositoryNodeId, issueNodeId: source.issueNodeId };
  return { sourceId: source.id, taskId: source.taskId, origin: source.origin as IssueOrigin, identity, issueNumber: source.issueNumber, issueUrl: source.issueUrl, snapshot: mapSnapshot(snapshot) };
}

function mapSnapshot(row: SnapshotRow) {
  return { id: row.id, revision: row.revision, origin: row.origin as IssueOrigin, publicationAttemptId: row.publicationAttemptId, title: row.title, bodyMarkdown: row.bodyMarkdown, githubUpdatedAt: row.githubUpdatedAt, contentHash: row.contentHash, verifiedAt: row.verifiedAt, verifiedByUserId: row.verifiedByUserId };
}
