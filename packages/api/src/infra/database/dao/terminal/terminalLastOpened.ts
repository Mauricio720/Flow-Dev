import { and, desc, eq, isNull } from "drizzle-orm";
import type { LastTerminalOpening } from "../../../../application/database/dao/terminalSessionDao";
import type { Database } from "../../client";
import { taskTerminalSessions, users } from "../../schema";

export async function readLastOpened(database: Database, taskId: string): Promise<LastTerminalOpening | null> {
  const filter = and(eq(taskTerminalSessions.taskId, taskId), isNull(taskTerminalSessions.launchFailedAt));
  const [row] = await database
    .select({ name: users.name, displayName: users.displayName, openedAt: taskTerminalSessions.openedAt })
    .from(taskTerminalSessions)
    .innerJoin(users, eq(users.id, taskTerminalSessions.userId))
    .where(filter)
    .orderBy(desc(taskTerminalSessions.openedAt))
    .limit(1);
  return row ? { userName: row.displayName ?? row.name, openedAt: row.openedAt.toISOString() } : null;
}
