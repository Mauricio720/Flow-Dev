import { check, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { taskSessionPlanItems, taskSessionPlans } from "./sessionPlans";
import { taskTerminalSessions } from "./terminal";

export const taskSessionPlanRuns = pgTable("task_session_plan_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => taskSessionPlans.id, { onDelete: "cascade" }),
  hostId: text("host_id").notNull(),
  startedBy: uuid("started_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  state: text("state").notNull().default("running"),
  pauseReason: text("pause_reason"),
  pausedBy: uuid("paused_by").references(() => users.id, { onDelete: "set null" }),
  currentItemId: uuid("current_item_id").references(() => taskSessionPlanItems.id, { onDelete: "set null" }),
  currentSessionId: uuid("current_session_id").references(() => taskTerminalSessions.id, { onDelete: "set null" }),
  resumeCount: integer("resume_count").notNull().default(0),
  revision: integer("revision").notNull().default(1),
  requestKey: uuid("request_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("task_session_plan_runs_plan_id_unique").on(table.planId),
  check("task_session_plan_runs_state_check", sql`${table.state} in ('running','paused','completed')`),
  check("task_session_plan_runs_revision_check", sql`${table.revision} >= 1`),
  check("task_session_plan_runs_resume_count_check", sql`${table.resumeCount} >= 0`),
  index("task_session_plan_runs_host_state_idx").on(table.hostId, table.state),
]);
