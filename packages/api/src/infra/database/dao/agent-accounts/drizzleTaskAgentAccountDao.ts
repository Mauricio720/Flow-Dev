import { and, eq, sql } from "drizzle-orm";
import type { TaskAgentAccountDao, TaskAgentAccountChoice } from "../../../../application/agent-accounts/taskAgentAccountDao";
import type { AgentAccountProvider } from "../../../../application/agent-accounts/agentAccountTypes";
import type { Database } from "../../client";
import { agentAccounts, taskAgentAccounts, tasks } from "../../schema";

export class DrizzleTaskAgentAccountDao implements TaskAgentAccountDao {
  constructor(private readonly database: Database) {}

  async projectIdOf(taskId: string) {
    const [task] = await this.database.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    return task?.projectId ?? null;
  }

  async choicesOf(taskId: string): Promise<TaskAgentAccountChoice[]> {
    const rows = await this.database.select({ provider: taskAgentAccounts.provider, accountId: taskAgentAccounts.accountId, chosenBy: taskAgentAccounts.chosenBy, version: taskAgentAccounts.version, label: agentAccounts.label, status: agentAccounts.status, ownerUserId: agentAccounts.ownerUserId, removedAt: agentAccounts.removedAt }).from(taskAgentAccounts).innerJoin(agentAccounts, eq(taskAgentAccounts.accountId, agentAccounts.id)).where(eq(taskAgentAccounts.taskId, taskId));
    return rows.map((row) => ({ ...row, provider: row.provider as TaskAgentAccountChoice["provider"], status: row.status as TaskAgentAccountChoice["status"] }));
  }

  set(input: { taskId: string; provider: AgentAccountProvider; accountId: string | null; chosenBy: string; version: number }) {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      const [task] = await database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, input.taskId)).for("update");
      if (!task) return null;
      const [current] = await database.select({ version: sql<number>`coalesce(max(${taskAgentAccounts.version}), 0)` }).from(taskAgentAccounts).where(eq(taskAgentAccounts.taskId, input.taskId));
      if (Number(current?.version ?? 0) !== input.version) return null;
      const nextVersion = input.version + 1;
      if (input.accountId === null) {
        await database.delete(taskAgentAccounts).where(and(eq(taskAgentAccounts.taskId, input.taskId), eq(taskAgentAccounts.provider, input.provider)));
        return nextVersion;
      }
      await database.insert(taskAgentAccounts).values({ taskId: input.taskId, provider: input.provider, accountId: input.accountId, chosenBy: input.chosenBy, version: nextVersion }).onConflictDoUpdate({ target: [taskAgentAccounts.taskId, taskAgentAccounts.provider], set: { accountId: input.accountId, chosenBy: input.chosenBy, version: nextVersion, updatedAt: new Date() } });
      return nextVersion;
    });
  }
}
