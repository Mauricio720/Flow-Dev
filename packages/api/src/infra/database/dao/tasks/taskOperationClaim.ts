import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import type { WorkerClaim } from "../../../../application/database/dao/taskOperationDao";
import { taskContextCapabilities, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";

const LEASE_MS = 60_000;
const MAX_EXECUTIONS = 3;

export async function claimTaskOperation(database: Database, workerId: string): Promise<WorkerClaim | null> {
  return database.transaction(async (tx) => {
    const now = new Date();
    await failExhaustedOperation(tx, now);
    const reclaimReady = sql`${taskOperations.leaseUntil} + make_interval(secs => case ${taskOperations.attempts} when 1 then 5 when 2 then 15 else 45 end) <= ${now.toISOString()}::timestamptz`;
    const operation = (await tx.select().from(taskOperations).where(and(eq(taskOperations.kind, "generate"), lte(taskOperations.nextRunAt, now), lte(taskOperations.attempts, MAX_EXECUTIONS - 1), or(eq(taskOperations.state, "queued"), and(eq(taskOperations.state, "running"), reclaimReady)))).orderBy(asc(taskOperations.nextRunAt), asc(taskOperations.createdAt)).limit(1).for("update", { skipLocked: true }))[0];
    if (!operation) return null;
    const executionId = crypto.randomUUID();
    const contextCapability = randomBytes(32).toString("base64url");
    const fence = operation.fence + 1;
    const leaseUntil = new Date(now.getTime() + LEASE_MS);
    await tx.update(taskOperations).set({ state: "running", executionId, leaseOwner: workerId, leaseUntil, heartbeatAt: now, fence, attempts: operation.attempts + 1, updatedAt: now }).where(eq(taskOperations.id, operation.id));
    await tx.update(taskContextCapabilities).set({ expiresAt: now }).where(eq(taskContextCapabilities.operationId, operation.id));
    await tx.insert(taskContextCapabilities).values({ executionId, operationId: operation.id, fence, expiresAt: leaseUntil, tokenHash: hashCapability(contextCapability) });
    return { taskId: operation.taskId, operationId: operation.id, executionId, fence, workerId, sessionId: operation.initiatedSessionId, contextCapability };
  });
}

async function failExhaustedOperation(tx: Parameters<Parameters<Database["transaction"]>[0]>[0], now: Date) {
  const expired = (await tx.select().from(taskOperations).where(and(eq(taskOperations.kind, "generate"), eq(taskOperations.state, "running"), eq(taskOperations.attempts, MAX_EXECUTIONS), lte(taskOperations.leaseUntil, now))).limit(1).for("update", { skipLocked: true }))[0];
  if (!expired) return;
  const [task] = await tx.select().from(tasks).where(and(eq(tasks.id, expired.taskId), eq(tasks.activeOperationId, expired.id))).limit(1);
  await tx.update(taskOperations).set({ state: "failed", leaseOwner: null, leaseUntil: null, lastError: "provider_unavailable", updatedAt: now }).where(eq(taskOperations.id, expired.id));
  if (task) await tx.update(tasks).set({ status: task.currentRevisionId ? "draft_ready" : "generation_failed", activeOperationId: null, lastError: "provider_unavailable", version: task.version + 1, updatedAt: now }).where(eq(tasks.id, task.id));
  await tx.delete(taskContextCapabilities).where(eq(taskContextCapabilities.operationId, expired.id));
}

export function hashCapability(value: string) { return createHash("sha256").update(value).digest("hex"); }
