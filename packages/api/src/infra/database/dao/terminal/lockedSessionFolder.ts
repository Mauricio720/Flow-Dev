import { eq } from "drizzle-orm";
import type { Database } from "../../client";
import { taskReviewCycles, taskSessionPlanItems, taskSessionPlans, taskTerminalSessions } from "../../schema";

const REVIEW_PURPOSES: ReadonlySet<string> = new Set(["review", "review_execute"]);

export type LockedSessionRow = { row: typeof taskTerminalSessions.$inferSelect; captureFolder: string | null };

export async function lockSessionWithFolder(database: Database, sessionId: string): Promise<LockedSessionRow | null> {
  const [found] = await database.select({ row: taskTerminalSessions, planTasksFolder: taskSessionPlans.tasksFolder, reviewTasksFolder: taskReviewCycles.tasksFolder }).from(taskTerminalSessions).leftJoin(taskSessionPlanItems, eq(taskSessionPlanItems.id, taskTerminalSessions.planItemId)).leftJoin(taskSessionPlans, eq(taskSessionPlans.id, taskSessionPlanItems.planId)).leftJoin(taskReviewCycles, eq(taskReviewCycles.id, taskTerminalSessions.reviewCycleId)).where(eq(taskTerminalSessions.id, sessionId)).for("update", { of: taskTerminalSessions });
  if (!found) return null;
  const { row, planTasksFolder, reviewTasksFolder } = found;
  return { row, captureFolder: REVIEW_PURPOSES.has(row.purpose) ? reviewTasksFolder : planTasksFolder };
}
