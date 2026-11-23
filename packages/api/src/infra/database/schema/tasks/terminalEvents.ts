import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { taskTerminalSessions } from "./terminal";

export const taskTerminalEvents = pgTable("task_terminal_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => taskTerminalSessions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  path: text("path"),
  skill: text("skill"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_terminal_events_kind_check", sql`${table.kind} in ('started','prompt','skill','file_edit','command','waiting','attention','ended')`),
  check("task_terminal_events_summary_check", sql`char_length(${table.summary}) <= 500`),
  index("task_terminal_events_session_occurred_idx").on(table.sessionId, table.occurredAt),
  index("task_terminal_events_session_kind_occurred_idx").on(table.sessionId, table.kind, table.occurredAt),
]);
