import { and, eq } from "drizzle-orm";
import type { WorkerClaim } from "../../../../application/database/dao/taskOperationDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskContextCapabilities, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";

const SAFE_FAILURES = ["generation_timeout", "provider_unavailable", "provider_usage_limit", "invalid_agent_output", "invalid_agent_activity", "invalid_agent_source", "execution_mismatch", "input_capacity", "access_revoked", "context_limit", "service_unavailable"];

export async function requeueFailedOperation(database: Database, claim: WorkerClaim, operation: typeof taskOperations.$inferSelect, delays: number[], reason: string) {
  const seconds = delays[operation.attempts - 1] ?? delays.at(-1) ?? 45;
  await database.update(taskOperations).set({ state: "queued", executionId: null, leaseOwner: null, leaseUntil: null, heartbeatAt: null, nextRunAt: new Date(Date.now() + seconds * 1000), lastError: safeFailure(reason), updatedAt: new Date() }).where(eq(taskOperations.id, claim.operationId));
  await database.delete(taskContextCapabilities).where(and(eq(taskContextCapabilities.operationId, claim.operationId), eq(taskContextCapabilities.executionId, claim.executionId)));
}

export async function finishFailedOperation(database: Database, claim: WorkerClaim, task: typeof tasks.$inferSelect, reason: string) {
  const safeReason = safeFailure(reason);
  await database.update(taskOperations).set({ state: "failed", lastError: safeReason, leaseOwner: null, leaseUntil: null, updatedAt: new Date() }).where(eq(taskOperations.id, claim.operationId));
  await database.update(tasks).set({ status: task.currentRevisionId ? "draft_ready" : "generation_failed", activeOperationId: null, lastError: safeReason, version: task.version + 1, updatedAt: new Date() }).where(eq(tasks.id, task.id));
  await database.delete(taskContextCapabilities).where(and(eq(taskContextCapabilities.operationId, claim.operationId), eq(taskContextCapabilities.executionId, claim.executionId)));
}

function safeFailure(reason: string) { return SAFE_FAILURES.includes(reason) ? reason : "provider_unavailable"; }
