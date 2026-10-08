import { check, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { tasks } from "./records";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const taskExecutionPlans = pgTable("task_execution_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  kind: text("kind").notNull().default("os_unified"),
  revision: integer("revision").notNull().default(1),
  status: text("status").notNull().default("planned"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt,
  updatedAt,
}, (table) => [
  unique("task_execution_plans_task_unique").on(table.taskId),
  unique("task_execution_plans_id_task_unique").on(table.id, table.taskId),
  check("task_execution_plans_kind_check", sql`${table.kind} = 'os_unified'`),
  check("task_execution_plans_status_check", sql`${table.status} IN ('planned','running','completed','canceled')`),
  check("task_execution_plans_revision_check", sql`${table.revision} > 0`),
]);

export const taskExecutionPlanSaves = pgTable("task_execution_plan_saves", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  idempotencyKey: uuid("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  resultRevision: integer("result_revision").notNull(),
  createdAt,
}, (table) => [primaryKey({ columns: [table.taskId, table.idempotencyKey] })]);
