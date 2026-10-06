import { and, eq } from "drizzle-orm";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { PlanningReceipt, PlanningCommandTarget } from "../../../../application/database/dao/taskPlanningDao";
import { taskCommandReceipts, tasks } from "../../schema";
import type { Database } from "../../client";

export async function findPlanningTask(database: Database, target: Pick<PlanningCommandTarget, "projectId" | "taskId">) {
  const row = (await database.select().from(tasks).where(and(eq(tasks.projectId, target.projectId), eq(tasks.id, target.taskId))).limit(1).for("update"))[0];
  if (!row) throw new TaskError("task_unavailable");
  return row;
}

export async function findPlanningReplay(database: Database, input: PlanningCommandTarget, action: string): Promise<PlanningReceipt | null> {
  const receipt = (await database.select().from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, action), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
  if (!receipt) return null;
  if (receipt.taskId !== input.taskId || receipt.payloadHash !== input.payloadHash) throw new TaskError("request_key_reused");
  return parsePlanningReceipt(receipt.acceptedResult);
}

export function parsePlanningReceipt(value: unknown): PlanningReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TaskError("invalid_stored_content");
  const result = value as Record<string, unknown>;
  if (typeof result.taskId !== "string" || typeof result.version !== "number" || !Number.isSafeInteger(result.version) || result.version < 1) throw new TaskError("invalid_stored_content");
  if (!(result.operationId === null || typeof result.operationId === "string") || !(result.decisionId === null || typeof result.decisionId === "string")) throw new TaskError("invalid_stored_content");
  if (!(result.decisionVersion === null || (typeof result.decisionVersion === "number" && Number.isSafeInteger(result.decisionVersion) && result.decisionVersion > 0))) throw new TaskError("invalid_stored_content");
  return result as PlanningReceipt;
}

export async function savePlanningReceipt(database: Database, input: PlanningCommandTarget, action: string, receipt: PlanningReceipt) {
  await database.insert(taskCommandReceipts).values({ projectId: input.projectId, actorUserId: input.actorUserId, action, requestKey: input.requestKey, payloadHash: input.payloadHash, taskId: input.taskId, operationId: receipt.operationId, acceptedResult: receipt });
}
