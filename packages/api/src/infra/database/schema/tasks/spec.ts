import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../../schema";
import { tasks } from "./records";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const taskSpecWorkflows = pgTable("task_spec_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  authorUserId: uuid("author_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  publicationId: uuid("publication_id").notNull(),
  planningDecisionId: uuid("planning_decision_id").notNull(),
  selectedRoute: text("selected_route").notNull(),
  version: integer("version").notNull().default(1),
  currentStage: text("current_stage").notNull(),
  state: text("state").notNull().default("queued"),
  workspaceId: uuid("workspace_id"),
  createdAt,
  updatedAt,
}, (table) => [unique("task_spec_workflows_task_unique").on(table.taskId)]);

export const taskSpecWorkspaces = pgTable("task_spec_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  repositoryGithubId: text("repository_github_id").notNull(),
  repositoryNodeId: text("repository_node_id").notNull(),
  baseCommit: text("base_commit").notNull(),
  runnerId: text("runner_id").notNull(),
  checkoutLocator: text("checkout_locator").notNull(),
  slug: text("slug").notNull(),
  installedManifestHash: text("installed_manifest_hash"),
  state: text("state").notNull().default("ready"),
  capacity: jsonb("capacity").$type<Record<string, unknown>>().notNull().default({}),
  createdAt,
  updatedAt,
}, (table) => [unique("task_spec_workspaces_workflow_unique").on(table.workflowId), unique("task_spec_workspaces_slug_unique").on(table.slug)]);

export const taskSpecStages = pgTable("task_spec_stages", {
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  stage: text("stage").notNull(),
  state: text("state").notNull().default("not_started"),
  currentAttemptId: uuid("current_attempt_id"),
  currentPackageId: uuid("current_package_id"),
  previousCompletePackageId: uuid("previous_complete_package_id"),
  approvedPackageId: uuid("approved_package_id"),
  version: integer("version").notNull().default(1),
  updatedAt,
}, (table) => [primaryKey({ columns: [table.workflowId, table.stage] })]);

export const taskSpecAttempts = pgTable("task_spec_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  stage: text("stage").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  kind: text("kind").notNull(),
  sourceAttemptId: uuid("source_attempt_id"),
  input: jsonb("input").$type<Record<string, unknown>>().notNull(),
  inputHash: text("input_hash").notNull(),
  state: text("state").notNull().default("queued"),
  runtimeWorkspaceId: text("runtime_workspace_id"),
  runtimeSessionId: text("runtime_session_id"),
  runtimeTurnId: text("runtime_turn_id"),
  promptMessageId: uuid("prompt_message_id").defaultRandom().notNull(),
  promptIdempotencyKey: uuid("prompt_idempotency_key").defaultRandom().notNull(),
  leaseOwner: text("lease_owner"),
  leaseFence: integer("lease_fence").notNull().default(0),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  runtimeCursor: text("runtime_cursor"),
  terminalReason: text("terminal_reason"),
  stopRequestedAt: timestamp("stop_requested_at", { withTimezone: true }),
  attention: text("attention"),
  createdAt,
  updatedAt,
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [
  unique("task_spec_attempts_number_unique").on(table.workflowId, table.attemptNumber),
  uniqueIndex("task_spec_attempts_active_workflow_idx").on(table.workflowId).where(sql`${table.state} in ('queued','dispatching','running','waiting','finalizing','stopping','reconciling')`),
  index("task_spec_attempts_queue_idx").on(table.state, table.createdAt).where(sql`${table.state} = 'queued'`),
]);
