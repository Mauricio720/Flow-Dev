import { and, eq, isNull, sql } from "drizzle-orm";
import type { CreationOutcome, IssueReceipt } from "../../../../application/github/issueGateway";
import type { PublicationAttempt } from "../../../../application/database/dao/taskPublicationDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskOperations, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";

export async function fenceTaskPublication(database: Database, taskId: string, attemptId: string): Promise<PublicationAttempt | null> {
  return database.transaction(async (tx) => {
    const attempt = (await tx.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.id, attemptId))).limit(1).for("update"))[0];
    if (!attempt || attempt.outcome !== "queued") return null;
    const now = new Date();
    await tx.update(taskPublicationAttempts).set({ outcome: "dispatching", dispatchStartedAt: now }).where(eq(taskPublicationAttempts.id, attemptId));
    await tx.update(taskOperations).set({ state: "running", dispatchStartedAt: now, attempts: 1, updatedAt: now }).where(eq(taskOperations.id, attempt.operationId));
    return mapAttempt({ ...attempt, outcome: "dispatching", dispatchStartedAt: now });
  });
}

type SettlementClaim = { operationId: string; workerId: string };

export async function settleTaskPublication(database: Database, taskId: string, attemptId: string, outcome: CreationOutcome, claim?: SettlementClaim) {
  await database.transaction(async (tx) => {
    const attempt = (await tx.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.id, attemptId))).limit(1).for("update"))[0];
    if (!attempt || !allowedOutcome(attempt.outcome, outcome) || !await canSettle(tx as unknown as Database, attempt, claim)) return;
    const now = new Date();
    if (outcome.status === "created") return recordCreated(tx as unknown as Database, attempt, outcome.receipt, now);
    if (outcome.status === "rejected") return recordRejected(tx as unknown as Database, attempt, outcome.reason, now);
    return recordUncertain(tx as unknown as Database, attempt, outcome.reason, now);
  });
}

function allowedOutcome(state: string, outcome: CreationOutcome) {
  if (state === "queued") return outcome.status === "rejected";
  if (state === "uncertain") return outcome.status !== "uncertain";
  return state === "dispatching";
}

async function canSettle(database: Database, attempt: typeof taskPublicationAttempts.$inferSelect, claim?: SettlementClaim) {
  if (!claim) return true;
  const operation = (await database.select({ id: taskOperations.id }).from(taskOperations).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.state, "running"), eq(taskOperations.leaseOwner, claim.workerId), isNull(taskOperations.dispatchStartedAt))).limit(1))[0];
  return Boolean(operation && attempt.outcome === "queued");
}

async function recordCreated(database: Database, attempt: typeof taskPublicationAttempts.$inferSelect, receipt: IssueReceipt, now: Date) {
  if (receipt.repositoryId !== attempt.repositoryId || receipt.publisherGithubId !== attempt.publisherGithubId) throw new TaskError("invalid_provider_response");
  await database.update(taskPublicationAttempts).set({ outcome: "created", verifiedReceipt: receipt, issueId: receipt.issueId, issueNodeId: receipt.nodeId, issueNumber: receipt.number, issueUrl: receipt.url, issueCreatedAt: new Date(receipt.createdAt) }).where(eq(taskPublicationAttempts.id, attempt.id));
  await database.update(taskOperations).set({ state: "succeeded", result: { receipt }, leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, attempt.operationId));
  await database.update(tasks).set({ status: "published", activeOperationId: null, lastError: null, version: sql`${tasks.version} + 1`, updatedAt: now }).where(and(eq(tasks.id, attempt.taskId), eq(tasks.activeOperationId, attempt.operationId)));
}

async function recordRejected(database: Database, attempt: typeof taskPublicationAttempts.$inferSelect, reason: string, now: Date) {
  await database.update(taskPublicationAttempts).set({ outcome: "rejected", rejectionReason: reason }).where(eq(taskPublicationAttempts.id, attempt.id));
  await database.update(taskOperations).set({ state: "failed", lastError: reason, leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, attempt.operationId));
  await database.update(tasks).set({ status: "draft_ready", activeOperationId: null, lastError: reason, version: sql`${tasks.version} + 1`, updatedAt: now }).where(and(eq(tasks.id, attempt.taskId), eq(tasks.activeOperationId, attempt.operationId)));
}

async function recordUncertain(database: Database, attempt: typeof taskPublicationAttempts.$inferSelect, reason: string, now: Date) {
  await database.update(taskPublicationAttempts).set({ outcome: "uncertain", rejectionReason: reason }).where(eq(taskPublicationAttempts.id, attempt.id));
  await database.update(taskOperations).set({ state: "uncertain", lastError: reason, leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, attempt.operationId));
  await database.update(tasks).set({ status: "publication_uncertain", lastError: reason, version: sql`${tasks.version} + 1`, updatedAt: now }).where(and(eq(tasks.id, attempt.taskId), eq(tasks.activeOperationId, attempt.operationId)));
}

function mapAttempt(row: typeof taskPublicationAttempts.$inferSelect): PublicationAttempt {
  return { taskId: row.taskId, attemptId: row.id, operationId: row.operationId, repositoryId: row.repositoryId, publisherGithubId: row.publisherGithubId, owner: row.approvedOwner, name: row.approvedName, title: row.titleSnapshot, bodyMarkdown: row.bodySnapshot, outcome: row.outcome as PublicationAttempt["outcome"], issueNumber: row.issueNumber, receipt: row.verifiedReceipt as IssueReceipt | null };
}
