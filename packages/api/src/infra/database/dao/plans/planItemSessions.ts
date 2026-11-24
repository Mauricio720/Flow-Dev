import { sql } from "drizzle-orm";
import { desc, inArray } from "drizzle-orm";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskTerminalSessions } from "../../schema";

export type ItemSessionSummary = { id: string; status: TerminalSessionStatus; started: boolean };

export async function latestItemSessions(database: Database, itemIds: string[]): Promise<Map<string, ItemSessionSummary>> {
  if (itemIds.length === 0) return new Map();
  const rows = await database
    .selectDistinctOn([taskTerminalSessions.planItemId], {
      itemId: taskTerminalSessions.planItemId,
      id: taskTerminalSessions.id,
      status: taskTerminalSessions.status,
      started: sql<boolean>`bool_or(${taskTerminalSessions.startedAt} is not null) over (partition by ${taskTerminalSessions.planItemId})`,
    })
    .from(taskTerminalSessions)
    .where(inArray(taskTerminalSessions.planItemId, itemIds))
    .orderBy(taskTerminalSessions.planItemId, desc(taskTerminalSessions.openedAt), desc(taskTerminalSessions.id));
  return new Map(rows.map((row) => [row.itemId!, { id: row.id, status: row.status as TerminalSessionStatus, started: row.started }]));
}
