import { check, foreignKey, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { localMachines } from "./localMachines";
import { taskExecutionRuns } from "./tasks/taskExecutionRuns";

export const localCheckoutLocks = pgTable("local_checkout_locks", {
  machineId: uuid("machine_id").notNull(),
  checkoutHandle: text("checkout_handle").notNull(),
  runId: uuid("run_id").notNull(),
  fence: integer("fence").notNull(),
  state: text("state").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.machineId, table.checkoutHandle] }),
  foreignKey({ columns: [table.machineId], foreignColumns: [localMachines.id] }).onDelete("restrict"),
  foreignKey({ columns: [table.runId], foreignColumns: [taskExecutionRuns.id] }).onDelete("restrict"),
  check("local_checkout_locks_handle_check", sql`length(${table.checkoutHandle}) between 1 and 128`),
  check("local_checkout_locks_fence_check", sql`${table.fence} > 0`),
  check("local_checkout_locks_state_check", sql`${table.state} in ('active','reconciling')`),
]);
