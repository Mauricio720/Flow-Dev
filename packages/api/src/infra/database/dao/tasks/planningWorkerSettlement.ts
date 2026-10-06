import { and, eq, gt, sql } from "drizzle-orm";
import type { PlanningClaim, PlanningFailure, PlanningRequeue, PlanningSettlement } from "../../../../application/database/dao/taskPlanningWorkerDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskOperations, taskPlanningDecisions, tasks } from "../../schema";
import type { Database } from "../../client";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
const SUCCESS_PROTOCOL_VERSION = 1;

export function completePlanning(database: Database, input: PlanningSettlement, now: Date) {
  return database.transaction(async (tx) => {
    await lockCurrent(tx, input.claim, now, true);
    const { result } = input.envelope;
    const decision = (await tx.insert(taskPlanningDecisions).values({ taskId: input.claim.taskId, publicationAttemptId: await publicationOf(tx, input.claim), operationId: input.claim.operationId, executionId: input.claim.executionId, recommendedRoute: result.recommendedRoute, selectedRoute: result.recommendedRoute, decisionSource: "AI", complexity: result.complexity, summary: result.summary, reasons: result.reasons, uncertainties: result.uncertainties }).returning({ id: taskPlanningDecisions.id }))[0]!;
    await tx.update(taskOperations).set({ state: "succeeded", result: { protocolVersion: SUCCESS_PROTOCOL_VERSION, decisionId: decision.id }, leaseOwner: null, leaseUntil: null, lastError: null, updatedAt: now }).where(eq(taskOperations.id, input.claim.operationId));
    await tx.update(tasks).set({ planningStatus: "review", activeOperationId: null, version: sql`${tasks.version} + 1`, updatedAt: now }).where(eq(tasks.id, input.claim.taskId));
  });
}

export function failPlanning(database: Database, input: PlanningFailure, now: Date) {
  return database.transaction(async (tx) => {
    await lockCurrent(tx, input.claim, now, false);
    await tx.update(taskOperations).set({ state: "failed", lastError: input.reason, leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, input.claim.operationId));
    await tx.update(tasks).set({ planningStatus: "failed", activeOperationId: null, version: sql`${tasks.version} + 1`, updatedAt: now }).where(eq(tasks.id, input.claim.taskId));
  });
}

export function requeuePlanning(database: Database, input: PlanningRequeue, now: Date) {
  return database.transaction(async (tx) => {
    await lockCurrent(tx, input.claim, now, false);
    await tx.update(taskOperations).set({ state: "queued", nextRunAt: input.nextRunAt, leaseOwner: null, leaseUntil: null, updatedAt: now }).where(eq(taskOperations.id, input.claim.operationId));
    await tx.update(tasks).set({ version: sql`${tasks.version} + 1`, updatedAt: now }).where(eq(tasks.id, input.claim.taskId));
  });
}

async function lockCurrent(tx: Tx, claim: PlanningClaim, now: Date, requireLease: boolean) {
  const task = (await tx.select().from(tasks).where(eq(tasks.id, claim.taskId)).limit(1).for("update"))[0];
  const lease = requireLease ? gt(taskOperations.leaseUntil, now) : undefined;
  const operation = (await tx.select().from(taskOperations).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.state, "running"), eq(taskOperations.executionId, claim.executionId), eq(taskOperations.fence, claim.fence), eq(taskOperations.leaseOwner, claim.workerId), lease)).limit(1).for("update"))[0];
  const current = task?.planningOperationId === claim.operationId && task.activeOperationId === claim.operationId && task.planningStatus === "in_progress";
  if (!operation || !current) throw new TaskError("stale_execution");
}

async function publicationOf(tx: Tx, claim: PlanningClaim) {
  const operation = (await tx.select({ publicationAttemptId: taskOperations.publicationAttemptId }).from(taskOperations).where(eq(taskOperations.id, claim.operationId)).limit(1))[0];
  if (!operation?.publicationAttemptId) throw new TaskError("invalid_stored_content");
  return operation.publicationAttemptId;
}
