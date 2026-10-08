import { check, foreignKey, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tasks } from "./records";
import { taskPublicationAttempts } from "./boundaries";
import { projects, users } from "../../schema";

export const taskIssueSources = pgTable("task_issue_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().unique(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  repositoryId: text("repository_id").notNull(),
  repositoryNodeId: text("repository_node_id").notNull(),
  issueNodeId: text("issue_node_id").notNull(),
  issueNumber: integer("issue_number").notNull(),
  issueUrl: text("issue_url").notNull(),
  origin: text("origin").notNull(),
  publicationAttemptId: uuid("publication_attempt_id").references(() => taskPublicationAttempts.id, { onDelete: "restrict" }),
  currentSnapshotId: uuid("current_snapshot_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ columns: [table.taskId, table.projectId], foreignColumns: [tasks.id, tasks.projectId] }),
  unique("task_issue_sources_identity_unique").on(table.projectId, table.repositoryId, table.issueNodeId),
  check("task_issue_sources_origin_check", sql`${table.origin} in ('flow_dev','external')`),
]);

export const taskIssueSnapshots = pgTable("task_issue_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().references(() => taskIssueSources.id, { onDelete: "restrict" }),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  revision: integer("revision").notNull(),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  githubUpdatedAt: timestamp("github_updated_at", { withTimezone: true }).notNull(),
  contentHash: text("content_hash").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  verifiedByUserId: uuid("verified_by_user_id").references(() => users.id, { onDelete: "restrict" }),
  origin: text("origin").notNull(),
  publicationAttemptId: uuid("publication_attempt_id").references(() => taskPublicationAttempts.id, { onDelete: "restrict" }),
}, (table) => [
  unique("task_issue_snapshots_source_revision_unique").on(table.sourceId, table.revision),
  unique("task_issue_snapshots_source_id_unique").on(table.sourceId, table.id),
  check("task_issue_snapshots_revision_check", sql`${table.revision} > 0`),
]);

export const taskIssueClaims = pgTable("task_issue_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().unique().references(() => taskIssueSources.id, { onDelete: "restrict" }),
  taskId: uuid("task_id").notNull().unique().references(() => tasks.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  candidateUserId: uuid("candidate_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  operatorUserId: uuid("operator_user_id").references(() => users.id, { onDelete: "restrict" }),
  state: text("state").notNull(),
  revision: integer("revision").notNull().default(1),
  fence: integer("fence").notNull().default(1),
  boardNodeId: text("board_node_id").notNull(),
  boardItemId: text("board_item_id").notNull(),
  statusFieldId: text("status_field_id").notNull(),
  optionId: text("option_id").notNull(),
  sourceSnapshotId: uuid("source_snapshot_id").notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  reason: text("reason"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_issue_claims_state_check", sql`${table.state} in ('unclaimed','pending','uncertain','failed','claimed')`),
  check("task_issue_claims_operator_check", sql`(${table.state} = 'claimed') = (${table.operatorUserId} is not null)`),
  index("task_issue_claims_project_claimed_idx").on(table.projectId, table.claimedAt, table.id),
]);

export const taskIssueClaimAttempts = pgTable("task_issue_claim_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().references(() => taskIssueSources.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  claimantUserId: uuid("claimant_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  kind: text("kind").notNull().default("claim"),
  requestKey: uuid("request_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  state: text("state").notNull(),
  fence: integer("fence").notNull(),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  dispatchStartedAt: timestamp("dispatch_started_at", { withTimezone: true }),
  readBackStatus: text("read_back_status"),
  failureCode: text("failure_code"),
  retryAt: timestamp("retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("task_issue_claim_attempts_request_unique").on(table.claimantUserId, table.projectId, table.requestKey),
  check("task_issue_claim_attempts_state_check", sql`${table.state} in ('reserved','dispatching','uncertain','confirmed','failed','recorded')`),
  check("task_issue_claim_attempts_kind_check", sql`${table.kind} in ('claim','reconcile')`),
  uniqueIndex("task_issue_claim_attempts_unresolved_idx").on(table.sourceId).where(sql`${table.kind} = 'claim' and ${table.state} in ('reserved','dispatching','uncertain')`),
]);
