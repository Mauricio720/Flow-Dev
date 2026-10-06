import { integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { taskSpecAttempts, taskSpecWorkflows, taskSpecWorkspaces } from "./spec";
import { taskSpecCommands } from "./specCommands";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const taskSpecPackages = pgTable("task_spec_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  stage: text("stage").notNull(),
  attemptId: uuid("attempt_id").notNull().references(() => taskSpecAttempts.id, { onDelete: "restrict" }),
  revision: integer("revision").notNull(),
  parentPackageId: uuid("parent_package_id"),
  inputPackageIds: uuid("input_package_ids").array().notNull().default([]),
  manifestHash: text("manifest_hash").notNull(),
  captureState: text("capture_state").notNull(),
  diagnostics: jsonb("diagnostics").$type<unknown[]>().notNull().default([]),
  packageIndex: jsonb("package_index").$type<Record<string, unknown>>().notNull(),
  diffSummary: jsonb("diff_summary").$type<Record<string, unknown>>().notNull().default({}),
  createdAt,
  readinessVersion: integer("readiness_version").notNull().default(1),
}, (table) => [unique("task_spec_packages_attempt_manifest_unique").on(table.attemptId, table.manifestHash), unique("task_spec_packages_revision_unique").on(table.workflowId, table.stage, table.revision)]);

export const taskSpecDocuments = pgTable("task_spec_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id").notNull().references(() => taskSpecPackages.id, { onDelete: "restrict" }),
  path: text("path").notNull(),
  role: text("role").notNull(),
  sourceText: text("source_text").notNull(),
  byteCount: integer("byte_count").notNull(),
  sha256: text("sha256").notNull(),
  blocks: jsonb("blocks").$type<unknown[]>().notNull().default([]),
  createdAt,
}, (table) => [unique("task_spec_documents_path_unique").on(table.packageId, table.path)]);

export const taskSpecApprovals = pgTable("task_spec_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  stage: text("stage").notNull(),
  packageId: uuid("package_id").notNull().references(() => taskSpecPackages.id, { onDelete: "restrict" }),
  manifestHash: text("manifest_hash").notNull(),
  approverUserId: uuid("approver_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  installedManifestHash: text("installed_manifest_hash").notNull(),
}, (table) => [unique("task_spec_approvals_stage_unique").on(table.workflowId, table.stage)]);

export const taskSpecFinalizations = pgTable("task_spec_finalizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  workspaceId: uuid("workspace_id").notNull().references(() => taskSpecWorkspaces.id, { onDelete: "restrict" }),
  commandId: uuid("command_id").references(() => taskSpecCommands.id, { onDelete: "restrict" }),
  attemptId: uuid("attempt_id").notNull().references(() => taskSpecAttempts.id, { onDelete: "restrict" }),
  sourceManifest: jsonb("source_manifest").$type<Record<string, unknown>>().notNull(),
  targetManifest: jsonb("target_manifest").$type<Record<string, unknown>>().notNull(),
  fileSteps: jsonb("file_steps").$type<unknown[]>().notNull().default([]),
  phase: text("phase").notNull().default("prepared"),
  failureReason: text("failure_reason"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("task_spec_finalizations_pending_idx").on(table.workspaceId).where(sql`${table.phase} in ('prepared','installing','installed')`)]);
