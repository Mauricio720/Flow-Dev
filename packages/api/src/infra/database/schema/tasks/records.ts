import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../../schema";

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "restrict" }),
  repositoryId: text("repository_id").notNull(),
  repositoryNodeId: text("repository_node_id").notNull(),
  origin: text("origin").notNull().default("flow_dev"),
  status: text("status").notNull().default("generating"),
  version: integer("version").notNull().default(1),
  currentRevisionId: uuid("current_revision_id"),
  activeOperationId: uuid("active_operation_id"),
  pendingProposalOperationId: uuid("pending_proposal_operation_id"),
  planningStatus: text("planning_status"),
  planningOperationId: uuid("planning_operation_id"),
  planningDecisionId: uuid("planning_decision_id"),
  title: text("title").notNull().default(""),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("tasks_status_check", sql`${table.status} in ('generating','awaiting_clarification','draft_ready','generation_failed','publishing','publication_uncertain','published','imported')`),
  check("tasks_origin_check", sql`(${table.origin} = 'flow_dev' and ${table.authorUserId} is not null and ${table.status} <> 'imported') or (${table.origin} = 'external' and ${table.authorUserId} is null and ${table.status} = 'imported')`),
  check("tasks_version_check", sql`${table.version} > 0`),
  check("tasks_planning_status_check", sql`${table.planningStatus} is null or (${table.status} in ('published','imported') and ${table.planningStatus} in ('in_progress','failed','review','approved'))`),
  index("tasks_project_created_id_idx").on(table.projectId, table.createdAt, table.id),
  index("tasks_project_title_idx").on(table.projectId, table.title),
  index("tasks_project_author_idx").on(table.projectId, table.authorUserId),
  unique("tasks_id_project_unique").on(table.id, table.projectId),
]);

export const taskMessages = pgTable("task_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  operationId: uuid("operation_id"),
  sequence: integer("sequence").notNull(),
  role: text("role").notNull(),
  kind: text("kind").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("task_messages_task_sequence_unique").on(table.taskId, table.sequence),
  uniqueIndex("task_messages_user_operation_unique").on(table.taskId, table.operationId).where(sql`${table.role} = 'user' and ${table.operationId} is not null`),
  check("task_messages_role_check", sql`${table.role} in ('user','assistant')`),
  check("task_messages_kind_check", sql`${table.kind} in ('intent','clarification','refinement','result')`),
  check("task_messages_sequence_check", sql`${table.sequence} > 0`),
]);

export const taskDraftRevisions = pgTable("task_draft_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  revisionNumber: integer("revision_number").notNull(),
  parentRevisionId: uuid("parent_revision_id"),
  operationId: uuid("operation_id"),
  canonicalDraft: jsonb("canonical_draft").notNull(),
  evidenceBindings: jsonb("evidence_bindings").notNull().default([]),
  manuallyEditedPaths: text("manually_edited_paths").array().notNull().default([]),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("task_draft_revisions_task_number_unique").on(table.taskId, table.revisionNumber),
  uniqueIndex("task_draft_revisions_task_id_id_unique").on(table.taskId, table.id),
  check("task_draft_revisions_number_check", sql`${table.revisionNumber} > 0`),
  index("task_draft_revisions_task_created_idx").on(table.taskId, table.createdAt, table.id),
]);

export const taskCommandReceipts = pgTable("task_command_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  requestKey: uuid("request_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  operationId: uuid("operation_id"),
  revisionId: uuid("revision_id"),
  acceptedResult: jsonb("accepted_result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("task_command_receipts_scope_unique").on(table.projectId, table.actorUserId, table.action, table.requestKey), check("task_command_receipts_action_check", sql`${table.action} in ('start','send','retryGeneration','resolveRefinement','saveDraft','publish','reconcilePublication','planning.start','planning.retry','planning.selectRoute','planning.approve')`)]);

export const taskRepositorySnapshot = pgTable("task_repository_snapshots", {
  taskId: uuid("task_id").primaryKey().references(() => tasks.id, { onDelete: "restrict" }),
  repositoryOwner: text("repository_owner").notNull(),
  repositoryName: text("repository_name").notNull(),
  visibility: text("visibility").notNull(),
  archived: boolean("archived").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
});
