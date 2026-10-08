import { eq } from "drizzle-orm";
import { taskIssueSources, tasks } from "../../schema";
import type { Database } from "../../client";
import { sourceContentHash } from "../../../../application/services/assigned-issues/assignedIssueRules";
import { lockIdentity } from "./identityLock";
import { insertSnapshot } from "./sourceBinding";
import { loadSource, sourceByIdentity } from "./sourceRecords";

type PublishedAttempt = { id: string; taskId: string; publisherUserId: string; repositoryId: string; repositoryNodeId: string; titleSnapshot: string; bodySnapshot: string };
type Receipt = { nodeId: string; number: number; url: string; createdAt: string };

export async function bindPublishedSource(db: Database, attempt: PublishedAttempt, receipt: Receipt) {
  const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, attempt.taskId)).limit(1);
  const identity = { projectId: task!.projectId, repositoryId: attempt.repositoryId, repositoryNodeId: attempt.repositoryNodeId, issueNodeId: receipt.nodeId };
  await lockIdentity(db, identity);
  if (await loadSource(db, sourceByIdentity(identity))) return;
  const [source] = await db.insert(taskIssueSources).values({ taskId: attempt.taskId, ...identity, issueNumber: receipt.number, issueUrl: receipt.url, origin: "flow_dev", publicationAttemptId: attempt.id }).returning({ id: taskIssueSources.id });
  const createdAt = new Date(receipt.createdAt);
  const contentHash = sourceContentHash({ repositoryId: attempt.repositoryId, issueNodeId: receipt.nodeId, title: attempt.titleSnapshot, bodyMarkdown: attempt.bodySnapshot });
  const snapshot = { title: attempt.titleSnapshot, bodyMarkdown: attempt.bodySnapshot, githubUpdatedAt: createdAt, contentHash, verifiedAt: createdAt, verifiedByUserId: attempt.publisherUserId };
  const snapshotId = await insertSnapshot(db, { sourceId: source!.id, taskId: attempt.taskId, revision: 1, origin: "flow_dev", publicationAttemptId: attempt.id }, snapshot);
  await db.update(taskIssueSources).set({ currentSnapshotId: snapshotId }).where(eq(taskIssueSources.id, source!.id));
}
