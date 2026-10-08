import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { tasks } from "./records";
import { taskExecutionRuns } from "./taskExecutionRuns";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const taskUnifiedPackages = pgTable("task_unified_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  sourceRunId: uuid("source_run_id").notNull().references(() => taskExecutionRuns.id, { onDelete: "restrict" }),
  snapshotId: uuid("snapshot_id").notNull(),
  format: text("format").notNull().default("os_spec_v1"),
  version: integer("version").notNull(),
  status: text("status").notNull().default("review_ready"),
  manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
  createdAt,
}, (table) => [
  unique("task_unified_packages_version_unique").on(table.taskId, table.version),
  check("task_unified_packages_format_check", sql`${table.format} IN ('os_spec_v1','os_tasks_v1')`),
  check("task_unified_packages_status_check", sql`${table.status} IN ('review_ready','approved','superseded')`),
  index("task_unified_packages_task_idx").on(table.taskId, table.version),
]);

export const taskUnifiedPackageFiles = pgTable("task_unified_package_files", {
  packageId: uuid("package_id").notNull().references(() => taskUnifiedPackages.id, { onDelete: "restrict" }),
  path: text("path").notNull(),
  role: text("role").notNull(),
  sourceText: text("source_text").notNull(),
  byteCount: integer("byte_count").notNull(),
  sha256: text("sha256").notNull(),
  required: boolean("required").notNull(),
}, (table) => [unique("task_unified_package_files_path_unique").on(table.packageId, table.path)]);

export const taskUnifiedPackageApprovals = pgTable("task_unified_package_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id").notNull().references(() => taskUnifiedPackages.id, { onDelete: "restrict" }),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  approverUserId: uuid("approver_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  idempotencyKey: uuid("idempotency_key").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("task_unified_package_approvals_package_unique").on(table.packageId), unique("task_unified_package_approvals_key_unique").on(table.taskId, table.idempotencyKey)]);
