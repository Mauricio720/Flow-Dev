import { check, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { tasks } from "./records";

export const taskSessionPlans = pgTable("task_session_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tasksFolder: text("tasks_folder").notNull(),
  manifestVersion: integer("manifest_version").notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("task_session_plans_task_id_unique").on(table.taskId),
  check("task_session_plans_version_check", sql`${table.version} >= 1`),
]);

export const taskSessionPlanItems = pgTable("task_session_plan_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => taskSessionPlans.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  taskIds: text("task_ids").array().notNull(),
  agent: text("agent").notNull(),
  model: text("model").notNull(),
  effort: text("effort").notNull(),
  forcedBy: uuid("forced_by").references(() => users.id, { onDelete: "set null" }),
  forcedAt: timestamp("forced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_session_plan_items_position_check", sql`${table.position} >= 1`),
  check("task_session_plan_items_agent_check", sql`${table.agent} in ('claude','codex')`),
  check("task_session_plan_items_task_ids_check", sql`cardinality(${table.taskIds}) between 1 and 30 and array_to_string(${table.taskIds}, ',', '#') ~ '^task_[0-9]{2}(,task_[0-9]{2})*$'`),
  check("task_session_plan_items_model_check", sql`char_length(${table.model}) between 1 and 64`),
  check("task_session_plan_items_effort_check", sql`char_length(${table.effort}) between 1 and 64`),
  uniqueIndex("task_session_plan_items_plan_position_unique").on(table.planId, table.position),
]);
