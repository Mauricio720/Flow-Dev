import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { tasks } from "./records";

export const taskWorktreeChoices = pgTable("task_worktree_choices", {
  taskId: uuid("task_id").primaryKey().references(() => tasks.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  chosenByUserId: uuid("chosen_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  chosenAt: timestamp("chosen_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_worktree_choices_mode_check", sql`${table.mode} in ('worktree','checkout')`),
]);
