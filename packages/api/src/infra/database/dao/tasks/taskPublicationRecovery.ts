import { and, eq, sql } from "drizzle-orm";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskCommandReceipts, taskOperations, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";
import { payloadHash } from "./taskCommandHelpers";

export async function reconcileTaskPublication(database: Database, input: { taskId: string; attemptId: string; projectId: string; actorUserId: string; expectedVersion: number; requestKey: string }) {
  return database.transaction(async (tx) => {
    const hash = payloadHash([input.taskId, input.attemptId, input.expectedVersion]);
    const replay = await findRecoveryReplay(tx as unknown as Database, input, hash);
    if (replay) return replay;
    const task = (await tx.select().from(tasks).where(and(eq(tasks.id, input.taskId), eq(tasks.projectId, input.projectId))).limit(1).for("update"))[0];
    if (!task) throw new TaskError("task_unavailable");
    if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
    if (task.version !== input.expectedVersion) throw new TaskError("revision_conflict");
    const attempt = (await tx.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, input.taskId), eq(taskPublicationAttempts.id, input.attemptId))).limit(1).for("update"))[0];
    if (!attempt) throw new TaskError("wrong_attempt");
    if (attempt.outcome === "created") return saveRecoveryResult(tx as unknown as Database, input, hash, { status: "published", attemptId: attempt.id, issueNumber: attempt.issueNumber ?? undefined, issueUrl: attempt.issueUrl ?? undefined, version: task.version });
    if (attempt.outcome === "queued") throw new TaskError("attempt_not_uncertain");
    if (attempt.outcome === "rejected") throw new TaskError("attempt_not_uncertain");
    if (attempt.outcome === "dispatching") await markUncertain(tx as unknown as Database, task.id, attempt.operationId, attempt.id);
    return saveRecoveryResult(tx as unknown as Database, input, hash, { status: "publication_uncertain", attemptId: attempt.id, version: task.version + Number(attempt.outcome === "dispatching") });
  });
}

async function markUncertain(database: Database, taskId: string, operationId: string, attemptId: string) {
  const now = new Date();
  await database.update(taskPublicationAttempts).set({ outcome: "uncertain", rejectionReason: "delivery_unknown" }).where(eq(taskPublicationAttempts.id, attemptId));
  await database.update(taskOperations).set({ state: "uncertain", lastError: "delivery_unknown", leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, operationId));
  await database.update(tasks).set({ status: "publication_uncertain", lastError: "delivery_unknown", version: sql`${tasks.version} + 1`, updatedAt: now }).where(and(eq(tasks.id, taskId), eq(tasks.activeOperationId, operationId)));
}

async function findRecoveryReplay(database: Database, input: { projectId: string; actorUserId: string; requestKey: string }, hash: string) {
  const row = (await database.select().from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, "reconcilePublication"), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
  if (!row) return null;
  if (row.payloadHash !== hash) throw new TaskError("request_key_reused");
  return row.acceptedResult as { status: string; attemptId?: string; issueNumber?: number; issueUrl?: string; version?: number };
}

async function saveRecoveryResult(database: Database, input: { taskId: string; projectId: string; actorUserId: string; requestKey: string }, hash: string, result: { status: string; attemptId?: string; issueNumber?: number; issueUrl?: string; version?: number }) {
  await database.insert(taskCommandReceipts).values({ projectId: input.projectId, actorUserId: input.actorUserId, action: "reconcilePublication", requestKey: input.requestKey, payloadHash: hash, taskId: input.taskId, operationId: null, acceptedResult: result });
  return result;
}
