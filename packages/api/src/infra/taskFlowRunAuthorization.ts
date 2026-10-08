import { eq } from "drizzle-orm";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { RunRecord } from "../application/database/dao/taskFlowDao";
import { tasks } from "./database/schema";
import type { Database } from "./database/client";

export async function runAuthorization(authorization: WorkAuthorization, database: Database, run: RunRecord) {
  const [task] = await database.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, run.taskId)).limit(1);
  if (!task) return "work_unavailable";
  try {
    await authorization.requireOperate({ projectId: task.projectId, taskId: run.taskId, actorId: run.requestedBy }, { currentSource: true });
    return null;
  } catch (error) {
    if (error instanceof AssignedIssueError) return error.reason;
    throw error;
  }
}
