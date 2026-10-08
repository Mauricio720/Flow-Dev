import { and, eq, isNull, or } from "drizzle-orm";
import { taskIssueSnapshots, taskIssueSources, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";
import type { ResolvedSource, SnapshotDraft, SourceFacts } from "../../../../application/database/dao/issueSourceDao";
import { lockIdentity } from "./identityLock";
import { loadSource, sourceByIdentity } from "./sourceRecords";

const IMPORTED_STATUS = "imported";
const EXTERNAL_ORIGIN = "external";
const FLOW_DEV_ORIGIN = "flow_dev";

export async function resolveSource(db: Database, facts: SourceFacts): Promise<ResolvedSource> {
  await lockIdentity(db, facts.identity);
  const existing = await loadSource(db, sourceByIdentity(facts.identity));
  if (existing) return { ...(await refreshSnapshot(db, existing, facts.snapshot)), created: false };
  const published = await findPublication(db, facts);
  const taskId = published?.taskId ?? await insertImportedTask(db, facts);
  const origin = published ? FLOW_DEV_ORIGIN : EXTERNAL_ORIGIN;
  const [source] = await db.insert(taskIssueSources).values({ taskId, projectId: facts.identity.projectId, repositoryId: facts.identity.repositoryId, repositoryNodeId: facts.identity.repositoryNodeId, issueNodeId: facts.identity.issueNodeId, issueNumber: facts.issueNumber, issueUrl: facts.issueUrl, origin, publicationAttemptId: published?.attemptId ?? null }).returning();
  const snapshotId = await insertSnapshot(db, { sourceId: source!.id, taskId, revision: 1, origin, publicationAttemptId: published?.attemptId ?? null }, facts.snapshot);
  await db.update(taskIssueSources).set({ currentSnapshotId: snapshotId }).where(eq(taskIssueSources.id, source!.id));
  return { ...(await loadSource(db, eq(taskIssueSources.id, source!.id)))!, created: !published };
}

async function findPublication(db: Database, facts: SourceFacts) {
  const { identity } = facts;
  const matches = or(eq(taskPublicationAttempts.issueNodeId, identity.issueNodeId), and(isNull(taskPublicationAttempts.issueNodeId), eq(taskPublicationAttempts.issueNumber, facts.issueNumber)));
  const [row] = await db.select({ taskId: taskPublicationAttempts.taskId, attemptId: taskPublicationAttempts.id }).from(taskPublicationAttempts).innerJoin(tasks, eq(tasks.id, taskPublicationAttempts.taskId)).leftJoin(taskIssueSources, eq(taskIssueSources.taskId, tasks.id)).where(and(eq(tasks.projectId, identity.projectId), eq(taskPublicationAttempts.repositoryId, identity.repositoryId), eq(taskPublicationAttempts.outcome, "created"), isNull(taskIssueSources.id), matches)).limit(1);
  return row ?? null;
}

async function insertImportedTask(db: Database, facts: SourceFacts) {
  const { identity, snapshot } = facts;
  const [task] = await db.insert(tasks).values({ projectId: identity.projectId, authorUserId: null, origin: EXTERNAL_ORIGIN, repositoryId: identity.repositoryId, repositoryNodeId: identity.repositoryNodeId, status: IMPORTED_STATUS, title: snapshot.title }).returning({ id: tasks.id });
  return task!.id;
}

type SnapshotKey = { sourceId: string; taskId: string; revision: number; origin: string; publicationAttemptId: string | null };

export async function insertSnapshot(db: Database, key: SnapshotKey, snapshot: SnapshotDraft) {
  const [row] = await db.insert(taskIssueSnapshots).values({ ...key, ...snapshot }).returning({ id: taskIssueSnapshots.id });
  return row!.id;
}

async function refreshSnapshot(db: Database, existing: NonNullable<Awaited<ReturnType<typeof loadSource>>>, snapshot: SnapshotDraft) {
  if (existing.snapshot.contentHash === snapshot.contentHash) return existing;
  const key = { sourceId: existing.sourceId, taskId: existing.taskId, revision: existing.snapshot.revision + 1, origin: existing.origin, publicationAttemptId: null };
  const snapshotId = await insertSnapshot(db, key, snapshot);
  await db.update(taskIssueSources).set({ currentSnapshotId: snapshotId }).where(eq(taskIssueSources.id, existing.sourceId));
  return (await loadSource(db, eq(taskIssueSources.id, existing.sourceId)))!;
}
