import { check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tasks } from "./records";
import { taskOperations } from "./operations";
import { projects } from "../../schema";

export const taskContextCapabilities = pgTable("task_context_capabilities", {
  executionId: uuid("execution_id").primaryKey(),
  operationId: uuid("operation_id").notNull().references(() => taskOperations.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  fence: integer("fence").notNull(),
  pinnedCommitSha: text("pinned_commit_sha"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const taskCaptureLeases = pgTable("task_capture_leases", {
  userId: uuid("user_id").primaryKey(),
  captureId: uuid("capture_id").notNull().unique(),
  sessionId: text("session_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  expectedVersion: integer("expected_version"),
  tokenHash: text("token_hash").notNull(),
  state: text("state").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("task_capture_leases_state_check", sql`${table.state} in ('capturing','processing')`)]);

export const taskPublicationAttempts = pgTable("task_publication_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  operationId: uuid("operation_id").notNull().references(() => taskOperations.id, { onDelete: "restrict" }),
  revisionId: uuid("revision_id").notNull(),
  publisherUserId: uuid("publisher_user_id").notNull(),
  publisherGithubId: text("publisher_github_id").notNull(),
  repositoryId: text("repository_id").notNull(),
  repositoryNodeId: text("repository_node_id").notNull(),
  approvedOwner: text("approved_owner").notNull(),
  approvedName: text("approved_name").notNull(),
  previewHash: text("preview_hash").notNull(),
  titleSnapshot: text("title_snapshot").notNull(),
  bodySnapshot: text("body_snapshot").notNull(),
  approvalSessionId: text("approval_session_id").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  dispatchStartedAt: timestamp("dispatch_started_at", { withTimezone: true }),
  outcome: text("outcome").notNull().default("queued"),
  rejectionReason: text("rejection_reason"),
  requestId: text("request_id"),
  verifiedReceipt: jsonb("verified_receipt"),
  issueId: text("issue_id"),
  issueNodeId: text("issue_node_id"),
  issueNumber: integer("issue_number"),
  issueUrl: text("issue_url"),
  issueCreatedAt: timestamp("issue_created_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("task_publication_attempts_task_id_id_unique").on(table.taskId, table.id),
  check("task_publication_attempts_outcome_check", sql`${table.outcome} in ('queued','dispatching','created','rejected','uncertain')`),
  uniqueIndex("task_publication_attempts_unresolved_task_idx").on(table.taskId).where(sql`${table.outcome} in ('queued','dispatching','uncertain')`),
  uniqueIndex("task_publication_attempts_created_task_idx").on(table.taskId).where(sql`${table.outcome} = 'created'`),
  uniqueIndex("task_publication_attempts_repository_issue_idx").on(table.repositoryId, table.issueId).where(sql`${table.issueId} is not null`),
]);
