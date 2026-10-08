import { randomBytes } from "node:crypto";
import { and, asc, eq, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import type { PlanningClaim } from "../../../../application/database/dao/taskPlanningWorkerDao";
import { PLANNING_DEADLINE_MS, PLANNING_LEASE_MS, PLANNING_MAX_DISPATCHES } from "../../../../application/services/tasks/planningWorkerRules";
import { taskContextCapabilities, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";
import { hashCapability } from "./taskOperationClaim";

const SWEEP_BATCH_SIZE = 10;
const CAPABILITY_BYTES = 32;

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function claimPlanning(database: Database, workerId: string, now: Date): Promise<PlanningClaim | null> {
  return database.transaction(async (tx) => {
    await sweepPlanning(tx, now);
    const row = (await tx.select({ operation: taskOperations, task: tasks }).from(taskOperations).innerJoin(tasks, eq(tasks.id, taskOperations.taskId)).where(and(eq(taskOperations.kind, "plan"), isNotNull(taskOperations.requesterUserId), eq(tasks.planningOperationId, taskOperations.id), eq(tasks.planningStatus, "in_progress"), lt(taskOperations.attempts, PLANNING_MAX_DISPATCHES), or(and(eq(taskOperations.state, "queued"), lte(taskOperations.nextRunAt, now)), and(eq(taskOperations.state, "running"), lte(taskOperations.leaseUntil, now))))).orderBy(asc(taskOperations.nextRunAt), asc(taskOperations.createdAt)).limit(1).for("update", { of: [tasks, taskOperations], skipLocked: true }))[0];
    if (!row) return null;
    const executionId = crypto.randomUUID();
    const leaseUntil = new Date(now.getTime() + PLANNING_LEASE_MS);
    const fence = row.operation.fence + 1;
    await tx.update(taskOperations).set({ state: "running", executionId, leaseOwner: workerId, leaseUntil, heartbeatAt: now, fence, attempts: row.operation.attempts + 1, updatedAt: now }).where(eq(taskOperations.id, row.operation.id));
    await tx.update(tasks).set({ version: sql`${tasks.version} + 1`, updatedAt: now }).where(eq(tasks.id, row.task.id));
    const contextCapability = await issueCapability(tx, { operationId: row.operation.id, executionId, fence, expiresAt: leaseUntil }, now);
    return { taskId: row.task.id, projectId: row.task.projectId, requesterUserId: row.operation.requesterUserId!, sessionId: row.operation.initiatedSessionId, operationId: row.operation.id, executionId, fence, workerId, leaseUntil, attempts: row.operation.attempts + 1, deadline: new Date(row.operation.createdAt.getTime() + PLANNING_DEADLINE_MS), repositoryId: row.task.repositoryId, repositoryNodeId: row.task.repositoryNodeId, contextCapability };
  });
}

async function issueCapability(tx: Tx, grant: { operationId: string; executionId: string; fence: number; expiresAt: Date }, now: Date) {
  const contextCapability = randomBytes(CAPABILITY_BYTES).toString("base64url");
  await tx.update(taskContextCapabilities).set({ expiresAt: now }).where(eq(taskContextCapabilities.operationId, grant.operationId));
  await tx.insert(taskContextCapabilities).values({ ...grant, tokenHash: hashCapability(contextCapability) });
  return contextCapability;
}

async function sweepPlanning(tx: Tx, now: Date) {
  const expired = await tx.select({ operation: taskOperations }).from(tasks).innerJoin(taskOperations, eq(taskOperations.taskId, tasks.id)).where(and(eq(taskOperations.kind, "plan"), or(eq(taskOperations.state, "queued"), eq(taskOperations.state, "running")), or(lte(taskOperations.createdAt, new Date(now.getTime() - PLANNING_DEADLINE_MS)), and(eq(taskOperations.state, "running"), eq(taskOperations.attempts, PLANNING_MAX_DISPATCHES), lte(taskOperations.leaseUntil, now))))).limit(SWEEP_BATCH_SIZE).for("update", { of: [tasks, taskOperations], skipLocked: true });
  for (const { operation } of expired) await failExpired(tx, operation, now);
}

async function failExpired(tx: Tx, operation: typeof taskOperations.$inferSelect, now: Date) {
  const deadlineHit = operation.createdAt.getTime() <= now.getTime() - PLANNING_DEADLINE_MS;
  const reason = deadlineHit ? "planning_deadline" : "planning_provider_unavailable";
  await tx.update(taskOperations).set({ state: "failed", lastError: reason, leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, operation.id));
  await tx.update(tasks).set({ planningStatus: "failed", activeOperationId: null, version: sql`${tasks.version} + 1`, updatedAt: now }).where(and(eq(tasks.id, operation.taskId), eq(tasks.planningOperationId, operation.id), eq(tasks.planningStatus, "in_progress")));
}
