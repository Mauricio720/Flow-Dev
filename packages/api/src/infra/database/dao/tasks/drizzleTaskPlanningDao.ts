import { and, eq } from "drizzle-orm";
import type { PlanningCommandTarget, PlanningReceipt, TaskPlanningDao } from "../../../../application/database/dao/taskPlanningDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskCommandReceipts, taskPublicationAttempts } from "../../schema";
import type { Database } from "../../client";
import { acceptPlanningRetry, acceptPlanningStart } from "./planningStart";
import { approvePlanningRoute, savePlanningRoute } from "./planningReviewCommands";
import { parsePlanningReceipt } from "./planningReceiptHelpers";
import { readPlanningProjection } from "./planningProjection";

const RECEIPT_SCOPE_CONSTRAINT = "task_command_receipts_scope_unique";
const CREATED_OUTCOME = "created";

export class DrizzleTaskPlanningDao implements TaskPlanningDao {
  constructor(private readonly database: Database) {}

  async submission(target: Omit<PlanningCommandTarget, "payloadHash">, action: string): Promise<PlanningReceipt | null> {
    const row = (await this.database.select({ acceptedResult: taskCommandReceipts.acceptedResult, taskId: taskCommandReceipts.taskId }).from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, target.projectId), eq(taskCommandReceipts.actorUserId, target.actorUserId), eq(taskCommandReceipts.action, action), eq(taskCommandReceipts.requestKey, target.requestKey))).limit(1))[0];
    if (!row) return null;
    if (row.taskId !== target.taskId) throw new TaskError("task_unavailable");
    return parsePlanningReceipt(row.acceptedResult);
  }

  projection(taskId: string) { return readPlanningProjection(this.database, taskId); }

  async publishedIssueNodeId(taskId: string) {
    const row = (await this.database.select({ issueNodeId: taskPublicationAttempts.issueNodeId }).from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.outcome, CREATED_OUTCOME))).limit(1))[0];
    return row?.issueNodeId ?? null;
  }

  start(input: Parameters<TaskPlanningDao["start"]>[0]) { return this.guard(() => acceptPlanningStart(this.database, input)); }
  retry(input: Parameters<TaskPlanningDao["retry"]>[0]) { return this.guard(() => acceptPlanningRetry(this.database, input)); }
  selectRoute(input: Parameters<TaskPlanningDao["selectRoute"]>[0]) { return this.guard(() => savePlanningRoute(this.database, input)); }
  approve(input: Parameters<TaskPlanningDao["approve"]>[0]) { return this.guard(() => approvePlanningRoute(this.database, input)); }

  private async guard<T>(command: () => Promise<T>) {
    try { return await command(); }
    catch (error) {
      const cause = (error as { cause?: { code?: string; constraint_name?: string } }).cause;
      if (cause?.code === "23505" && cause.constraint_name === RECEIPT_SCOPE_CONSTRAINT) throw new TaskError("request_key_reused");
      throw error;
    }
  }
}
