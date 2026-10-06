import { asc, eq, inArray } from "drizzle-orm";
import type { TaskToolActivity } from "../../../../application/services/tasks/taskContracts";
import { taskToolActivity, users } from "../../schema";
import type { Database } from "../../client";

const MAX_ACTIVITY_ROWS = 500;

export class DrizzleTaskWorkspaceDao {
  constructor(private readonly database: Database) {}

  async activity(taskId: string): Promise<TaskToolActivity[]> {
    const rows = await this.database.select({ toolCallId: taskToolActivity.toolCallId, operationId: taskToolActivity.operationId, tool: taskToolActivity.tool, target: taskToolActivity.target, status: taskToolActivity.status, reason: taskToolActivity.reason, durationMs: taskToolActivity.durationMs, sequence: taskToolActivity.sequence }).from(taskToolActivity).where(eq(taskToolActivity.taskId, taskId)).orderBy(asc(taskToolActivity.createdAt), asc(taskToolActivity.sequence)).limit(MAX_ACTIVITY_ROWS);
    return rows.map((row) => ({ ...row, tool: row.tool as TaskToolActivity["tool"], status: row.status as TaskToolActivity["status"] }));
  }

  async authorNames(userIds: string[]) {
    if (!userIds.length) return new Map<string, string>();
    const rows = await this.database.select({ id: users.id, name: users.name, displayName: users.displayName }).from(users).where(inArray(users.id, userIds));
    return new Map(rows.map((row) => [row.id, row.displayName ?? row.name]));
  }
}
