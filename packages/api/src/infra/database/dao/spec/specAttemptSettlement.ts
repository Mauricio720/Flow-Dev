import { and, eq, sql } from "drizzle-orm";
import type { SpecDispatchAttempt } from "../../../../application/database/dao/taskSpecDao";
import type { SpecReason, SpecStage } from "../../../../application/services/spec/specContracts";
import { taskSpecAttempts, taskSpecCommands, taskSpecStages, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";

const QUEUED_STATE = "queued";
const FAILED_STATE = "failed";

export async function readDispatchAttempt(database: Database, attemptId: string): Promise<SpecDispatchAttempt | null> {
  const row = (await database.select({ attempt: taskSpecAttempts, workflow: taskSpecWorkflows }).from(taskSpecAttempts).innerJoin(taskSpecWorkflows, eq(taskSpecAttempts.workflowId, taskSpecWorkflows.id)).where(eq(taskSpecAttempts.id, attemptId)).limit(1))[0];
  if (!row) return null;
  const { attempt, workflow } = row;
  return { attemptId: attempt.id, workflowId: workflow.id, projectId: workflow.projectId, taskId: workflow.taskId, authorUserId: workflow.authorUserId, stage: attempt.stage as SpecStage, state: attempt.state, promptMessageId: attempt.promptMessageId, promptIdempotencyKey: attempt.promptIdempotencyKey };
}

export function failQueuedAttempt(database: Database, input: { attemptId: string; reason: SpecReason }) {
  return database.transaction(async (tx) => {
    const [attempt] = await tx.update(taskSpecAttempts).set({ state: FAILED_STATE, terminalReason: input.reason, finishedAt: new Date(), updatedAt: new Date() }).where(and(eq(taskSpecAttempts.id, input.attemptId), eq(taskSpecAttempts.state, QUEUED_STATE))).returning();
    if (!attempt) return false;
    await tx.update(taskSpecStages).set({ state: FAILED_STATE, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, attempt.workflowId), eq(taskSpecStages.stage, attempt.stage)));
    await tx.update(taskSpecWorkflows).set({ state: FAILED_STATE, version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, attempt.workflowId));
    await tx.update(taskSpecCommands).set({ status: "rejected", reason: input.reason, deliveryStatus: "not_applicable", updatedAt: new Date() }).where(eq(taskSpecCommands.attemptId, attempt.id));
    return true;
  });
}
