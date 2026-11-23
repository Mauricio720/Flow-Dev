import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "../../schema";
import { tasks } from "./records";
import { taskTerminalSessions } from "./terminal";

export const taskArtifacts = pgTable("task_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  relativePath: text("relative_path").notNull(),
  latestVersion: integer("latest_version").notNull().default(0),
  lastFailure: text("last_failure"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("task_artifacts_task_path_unique").on(table.taskId, table.relativePath),
]);

export const taskArtifactVersions = pgTable("task_artifact_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  artifactId: uuid("artifact_id").notNull().references(() => taskArtifacts.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  skill: text("skill").notNull(),
  sessionId: uuid("session_id").references(() => taskTerminalSessions.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  sha256: text("sha256").notNull(),
  byteSize: integer("byte_size").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  trigger: text("trigger").notNull(),
}, (table) => [
  check("task_artifact_versions_version_check", sql`${table.version} >= 1`),
  check("task_artifact_versions_size_check", sql`${table.byteSize} between 0 and 1048576`),
  check("task_artifact_versions_trigger_check", sql`${table.trigger} in ('stop','session_end')`),
  uniqueIndex("task_artifact_versions_artifact_version_unique").on(table.artifactId, table.version),
]);
