import { and, desc, eq, gt } from "drizzle-orm";
import type { ContextCall, ContextExecution } from "../../../../application/database/dao/issueContextDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { sessions, taskContextCapabilities, taskEvidence, taskOperations, taskToolActivity, taskToolCalls, tasks } from "../../schema";
import type { Database } from "../../client";

export async function persistContextCall(database: Database, context: ContextExecution, call: ContextCall) {
  return database.transaction(async (tx) => {
    await assertCurrentExecution(tx as unknown as Database, context);
    const evidenceRows = call.result.evidence.length ? await tx.insert(taskEvidence).values(call.result.evidence.map((row) => ({ ...row, taskId: context.taskId, operationId: context.operationId, toolCallId: call.toolCallId, repositoryId: context.repositoryId, repositoryNodeId: context.repositoryNodeId }))).returning({ id: taskEvidence.id }) : [];
    const result = { toolCallId: call.toolCallId, status: call.result.status, evidenceIds: evidenceRows.map((row) => row.id), durationMs: call.durationMs, ...(call.result.reason ? { reason: call.result.reason } : {}), data: call.result.data };
    const previous = (await tx.select({ sequence: taskToolActivity.sequence }).from(taskToolActivity).where(eq(taskToolActivity.executionId, call.executionId)).orderBy(desc(taskToolActivity.sequence)).limit(1))[0];
    await tx.insert(taskToolActivity).values({ taskId: context.taskId, operationId: context.operationId, executionId: call.executionId, toolCallId: call.toolCallId, tool: call.request.tool, target: call.target, status: call.result.status, reason: call.result.reason ?? null, durationMs: call.durationMs, evidenceIds: result.evidenceIds, sequence: (previous?.sequence ?? 0) + 1 });
    await tx.insert(taskToolCalls).values({ taskId: context.taskId, operationId: context.operationId, executionId: call.executionId, toolCallId: call.toolCallId, inputHash: call.inputHash, result });
    return result;
  });
}

async function assertCurrentExecution(database: Database, context: ContextExecution) {
  const rows = await database.select({ id: taskOperations.id }).from(taskOperations).innerJoin(tasks, eq(taskOperations.taskId, tasks.id)).innerJoin(taskContextCapabilities, eq(taskContextCapabilities.operationId, taskOperations.id)).innerJoin(sessions, eq(sessions.id, taskOperations.initiatedSessionId)).where(and(eq(taskOperations.id, context.operationId), eq(taskOperations.taskId, context.taskId), eq(taskOperations.executionId, context.executionId), eq(taskOperations.fence, context.fence), eq(taskOperations.initiatedSessionId, context.sessionId), eq(taskOperations.state, "running"), eq(tasks.activeOperationId, context.operationId), eq(tasks.authorUserId, context.userId), eq(taskContextCapabilities.executionId, context.executionId), eq(taskContextCapabilities.fence, context.fence), eq(sessions.userId, context.userId), gt(sessions.expiresAt, new Date()), gt(taskContextCapabilities.expiresAt, new Date()))).limit(1);
  if (!rows.length) throw new TaskError("stale_execution");
}
