import { and, eq } from "drizzle-orm";
import type { WorkerClaim } from "../../../../application/database/dao/taskOperationDao";
import type { GenerationEnvelope } from "../../../../application/issue-author/issueAuthorGateway";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskContextCapabilities, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";
import { finishFailedOperation, requeueFailedOperation } from "./taskOperationFailure";
import { lockOperation, revokeCapability, storeClarification, storeDraft, verifyActivity } from "./taskOperationSettlementHelpers";

const LEASE_MS = 60_000;
const RETRY_DELAYS_SECONDS = [5, 15, 45];

export async function heartbeatTaskOperation(database: Database, claim: WorkerClaim) {
  const now = new Date();
  const updated = await database.update(taskOperations).set({ heartbeatAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS), updatedAt: now }).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.state, "running"), eq(taskOperations.leaseOwner, claim.workerId), eq(taskOperations.executionId, claim.executionId), eq(taskOperations.fence, claim.fence))).returning({ id: taskOperations.id });
  if (!updated.length) throw new TaskError("stale_execution");
  await database.update(taskContextCapabilities).set({ expiresAt: new Date(now.getTime() + LEASE_MS) }).where(and(eq(taskContextCapabilities.operationId, claim.operationId), eq(taskContextCapabilities.executionId, claim.executionId), eq(taskContextCapabilities.fence, claim.fence)));
}

export async function completeTaskGeneration(database: Database, claim: WorkerClaim, envelope: GenerationEnvelope) {
  await database.transaction(async (tx) => {
    const operation = await lockOperation(tx as unknown as Database, claim);
    const task = (await tx.select().from(tasks).where(and(eq(tasks.id, claim.taskId), eq(tasks.activeOperationId, claim.operationId))).limit(1))[0];
    if (!task) throw new TaskError("stale_execution");
    await verifyActivity(tx as unknown as Database, claim, envelope);
    if (envelope.result.status === "needs_clarification") return storeClarification(tx as unknown as Database, claim, task, operation, envelope.result.question, envelope.activity);
    return storeDraft(tx as unknown as Database, claim, task, operation, envelope);
  });
}

export async function failTaskGeneration(database: Database, claim: WorkerClaim, reason: string) {
  await database.transaction(async (tx) => {
    const operation = await lockOperation(tx as unknown as Database, claim);
    const task = (await tx.select().from(tasks).where(and(eq(tasks.id, claim.taskId), eq(tasks.activeOperationId, claim.operationId))).limit(1))[0];
    if (!task) throw new TaskError("stale_execution");
    if (isRetryable(reason) && operation.attempts < RETRY_DELAYS_SECONDS.length) return requeueFailedOperation(tx as unknown as Database, claim, operation, RETRY_DELAYS_SECONDS, reason);
    await finishFailedOperation(tx as unknown as Database, claim, task, reason);
  });
}

function isRetryable(reason: string) { return ["provider_unavailable", "generation_timeout"].includes(reason); }
