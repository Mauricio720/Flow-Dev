import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { TaskCommandInput, TaskReceipt } from "../../../../application/database/dao/taskDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskCommandReceipts, tasks } from "../../schema";
import type { Database } from "../../client";
import { toTaskRecord } from "./taskDaoMapping";

export async function findTask(database: Database, projectId: string, taskId: string) {
  const row = (await database.select().from(tasks).where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId))).limit(1).for("update"))[0];
  if (!row) throw new TaskError("task_unavailable");
  return toTaskRecord(row);
}

export function assertWritable(task: ReturnType<typeof toTaskRecord>, input: Pick<TaskCommandInput, "actorUserId" | "expectedVersion">) {
  if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
  if (task.version !== input.expectedVersion) throw new TaskError("revision_conflict");
  if (["publishing", "publication_uncertain"].includes(task.status) || task.activeOperationId) throw new TaskError("operation_active");
  if (task.status === "published") throw new TaskError("task_complete");
  if (task.pendingProposalOperationId) throw new TaskError("refinement_pending");
}

export async function findReceipt(database: Database, input: { projectId: string; actorUserId: string; requestKey: string }, action: string, hash: string) {
  const row = (await database.select().from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, action), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
  if (!row) return null;
  if (row.payloadHash !== hash) throw new TaskError("request_key_reused");
  return row.acceptedResult;
}

export async function saveReceipt(database: Database, input: { projectId: string; actorUserId: string; requestKey: string }, action: string, hash: string, result: TaskReceipt) {
  await database.insert(taskCommandReceipts).values({ projectId: input.projectId, actorUserId: input.actorUserId, action, requestKey: input.requestKey, payloadHash: hash, taskId: result.taskId, operationId: result.operationId, acceptedResult: result });
}

export function payloadHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
