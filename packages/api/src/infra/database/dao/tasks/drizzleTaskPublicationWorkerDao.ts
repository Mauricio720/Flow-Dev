import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { TaskPublicationWorkerDao, PublicationWorkerClaim } from "../../../../application/database/dao/taskPublicationWorkerDao";
import type { CreationOutcome } from "../../../../application/github/issueGateway";
import { sessions, taskOperations, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";
import { settleTaskPublication } from "./taskPublicationState";
import { TaskError } from "../../../../application/services/tasks/taskErrors";

const LEASE_MS = 60_000;

export class DrizzleTaskPublicationWorkerDao implements TaskPublicationWorkerDao {
  constructor(private readonly database: Database, private readonly clock = () => new Date()) {}
  claim(workerId: string) { return claimPublication(this.database, workerId, this.clock()); }
  heartbeat(claim: PublicationWorkerClaim) { return heartbeatPublication(this.database, claim, this.clock()); }
  sessionActive(claim: PublicationWorkerClaim) { return hasActiveSession(this.database, claim, this.clock()); }
  fenceDispatch(claim: PublicationWorkerClaim) { return fencePublicationDispatch(this.database, claim, this.clock()); }
  settle(claim: PublicationWorkerClaim, outcome: CreationOutcome, dispatched: boolean) { return settleTaskPublication(this.database, claim.taskId, claim.attemptId, outcome, dispatched ? undefined : claim); }
}

async function claimPublication(database: Database, workerId: string, now: Date): Promise<PublicationWorkerClaim | null> {
  return database.transaction(async (tx) => {
    await expireFencedDispatches(tx as unknown as Database, now);
    const row = await selectClaim(tx as unknown as Database, now);
    if (!row) return null;
    await tx.update(taskOperations).set({ state: "running", leaseOwner: workerId, leaseUntil: new Date(now.getTime() + LEASE_MS), heartbeatAt: now, attempts: row.attempts + 1, updatedAt: now }).where(eq(taskOperations.id, row.operationId));
    return { ...row, workerId };
  });
}

async function selectClaim(database: Database, now: Date) {
  const expiredLease = and(eq(taskOperations.state, "running"), lte(taskOperations.leaseUntil, now));
  return (await database.select({ taskId: taskOperations.taskId, operationId: taskOperations.id, attempts: taskOperations.attempts, sessionId: taskOperations.initiatedSessionId, projectId: tasks.projectId, publisherUserId: taskPublicationAttempts.publisherUserId, publisherGithubId: taskPublicationAttempts.publisherGithubId, repositoryId: taskPublicationAttempts.repositoryId, repositoryNodeId: taskPublicationAttempts.repositoryNodeId, owner: taskPublicationAttempts.approvedOwner, name: taskPublicationAttempts.approvedName, revisionId: taskPublicationAttempts.revisionId, previewHash: taskPublicationAttempts.previewHash, title: taskPublicationAttempts.titleSnapshot, bodyMarkdown: taskPublicationAttempts.bodySnapshot, attemptId: taskPublicationAttempts.id }).from(taskOperations).innerJoin(taskPublicationAttempts, eq(taskPublicationAttempts.operationId, taskOperations.id)).innerJoin(tasks, eq(tasks.id, taskOperations.taskId)).where(and(eq(taskOperations.kind, "publish"), lte(taskOperations.nextRunAt, now), isNull(taskOperations.dispatchStartedAt), eq(taskPublicationAttempts.outcome, "queued"), eq(tasks.status, "publishing"), eq(tasks.activeOperationId, taskOperations.id), or(eq(taskOperations.state, "queued"), expiredLease))).orderBy(asc(taskOperations.nextRunAt), asc(taskOperations.createdAt)).limit(1).for("update", { of: taskOperations, skipLocked: true }))[0] ?? null;
}

async function heartbeatPublication(database: Database, claim: PublicationWorkerClaim, now: Date) {
  const updated = await database.update(taskOperations).set({ heartbeatAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS), updatedAt: now }).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.state, "running"), eq(taskOperations.leaseOwner, claim.workerId))).returning({ id: taskOperations.id });
  if (!updated.length) throw new TaskError("stale_execution");
}

async function hasActiveSession(database: Database, claim: PublicationWorkerClaim, now: Date) {
	return (await database.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, claim.sessionId), eq(sessions.userId, claim.publisherUserId), gt(sessions.expiresAt, now))).limit(1)).length > 0;
}

async function fencePublicationDispatch(database: Database, claim: PublicationWorkerClaim, now: Date) {
  return database.transaction(async (tx) => {
    const attempt = await tx.update(taskPublicationAttempts).set({ outcome: "dispatching", dispatchStartedAt: now }).where(and(eq(taskPublicationAttempts.id, claim.attemptId), eq(taskPublicationAttempts.taskId, claim.taskId), eq(taskPublicationAttempts.outcome, "queued"))).returning({ id: taskPublicationAttempts.id });
    if (!attempt.length) return false;
    const operation = await tx.update(taskOperations).set({ dispatchStartedAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS), heartbeatAt: now, updatedAt: now }).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.state, "running"), eq(taskOperations.leaseOwner, claim.workerId), isNull(taskOperations.dispatchStartedAt))).returning({ id: taskOperations.id });
    if (!operation.length) throw new TaskError("stale_execution");
    return true;
  });
}

async function expireFencedDispatches(database: Database, now: Date) {
  const rows = await database.select({ taskId: taskOperations.taskId, operationId: taskOperations.id, attemptId: taskPublicationAttempts.id }).from(taskOperations).innerJoin(taskPublicationAttempts, eq(taskPublicationAttempts.operationId, taskOperations.id)).where(and(eq(taskOperations.kind, "publish"), eq(taskOperations.state, "running"), lte(taskOperations.leaseUntil, now), sql` ${taskOperations.dispatchStartedAt} is not null `, eq(taskPublicationAttempts.outcome, "dispatching")));
  for (const row of rows) await markLostDispatch(database, row, now);
}

async function markLostDispatch(database: Database, row: { taskId: string; operationId: string; attemptId: string }, now: Date) {
  await database.update(taskPublicationAttempts).set({ outcome: "uncertain", rejectionReason: "delivery_unknown" }).where(and(eq(taskPublicationAttempts.id, row.attemptId), eq(taskPublicationAttempts.outcome, "dispatching")));
  await database.update(taskOperations).set({ state: "uncertain", lastError: "delivery_unknown", leaseOwner: null, leaseUntil: null, updatedAt: now }).where(and(eq(taskOperations.id, row.operationId), eq(taskOperations.state, "running"), lte(taskOperations.leaseUntil, now)));
  await database.update(tasks).set({ status: "publication_uncertain", lastError: "delivery_unknown", version: sql`${tasks.version} + 1`, updatedAt: now }).where(and(eq(tasks.id, row.taskId), eq(tasks.activeOperationId, row.operationId)));
}
