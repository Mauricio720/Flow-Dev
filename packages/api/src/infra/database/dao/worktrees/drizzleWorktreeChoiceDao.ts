import { and, eq, isNull } from "drizzle-orm";
import type { SaveWorktreeChoice, WorktreeChoiceDao, WorktreeChoiceState } from "../../../../application/database/dao/worktreeChoiceDao";
import type { WorktreeMode } from "../../../../application/worktrees/worktreeChoice";
import type { Database } from "../../client";
import { taskTerminalSessions, taskWorktreeChoices } from "../../schema";

async function hasOpenedSession(database: Database, taskId: string) {
  const filter = and(eq(taskTerminalSessions.taskId, taskId), isNull(taskTerminalSessions.launchFailedAt));
  const [row] = await database.select({ id: taskTerminalSessions.id }).from(taskTerminalSessions).where(filter).limit(1);
  return row !== undefined;
}

export async function readWorktreeChoiceState(database: Database, taskId: string): Promise<WorktreeChoiceState> {
  const [row] = await database.select().from(taskWorktreeChoices).where(eq(taskWorktreeChoices.taskId, taskId)).limit(1);
  const opened = await hasOpenedSession(database, taskId);
  const choice = row ? { mode: row.mode as WorktreeMode, chosenByUserId: row.chosenByUserId, chosenAt: row.chosenAt } : null;
  return { choice, opened };
}

export class DrizzleWorktreeChoiceDao implements WorktreeChoiceDao {
  constructor(private readonly database: Database) {}

  state(taskId: string) {
    return readWorktreeChoiceState(this.database, taskId);
  }

  saveBeforeFirstSession(input: SaveWorktreeChoice) {
    return this.database.transaction(async (tx) => {
      const database = tx as unknown as Database;
      if (await hasOpenedSession(database, input.taskId)) return false;
      const values = { taskId: input.taskId, mode: input.mode, chosenByUserId: input.actorId, chosenAt: input.at };
      await database.insert(taskWorktreeChoices).values(values).onConflictDoUpdate({ target: taskWorktreeChoices.taskId, set: { mode: values.mode, chosenByUserId: values.chosenByUserId, chosenAt: values.chosenAt } });
      return true;
    });
  }
}
