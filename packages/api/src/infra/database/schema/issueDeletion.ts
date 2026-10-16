import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "../schema";

export const issueDeletionOperations = pgTable("issue_deletion_operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  taskId: uuid("task_id"),
  repositoryId: text("repository_id").notNull(),
  repositoryNodeId: text("repository_node_id").notNull(),
  issueNodeId: text("issue_node_id"),
  issueNumber: integer("issue_number"),
  initiatorUserId: uuid("initiator_user_id").notNull(),
  requestKey: uuid("request_key").notNull(),
  state: text("state").notNull().default("stopping"),
  remotePresence: text("remote_presence").notNull().default("unknown"),
  workStopped: boolean("work_stopped").notNull().default(false),
  reason: text("reason"),
  retryAt: timestamp("retry_at", { withTimezone: true }),
  leaseOwner: text("lease_owner"),
  leaseFence: integer("lease_fence").notNull().default(0),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("issue_deletion_operations_task_unique").on(table.taskId).where(sql`${table.taskId} is not null`),
  uniqueIndex("issue_deletion_operations_identity_unique").on(table.projectId, table.repositoryId, table.issueNodeId).where(sql`${table.issueNodeId} is not null`),
  uniqueIndex("issue_deletion_operations_receipt_unique").on(table.initiatorUserId, table.requestKey),
  check("issue_deletion_operations_state_check", sql`${table.state} in ('stopping','reconciling','deleting_remote','verifying_remote','cleaning_local','recoverable','completed')`),
  check("issue_deletion_operations_presence_check", sql`${table.remotePresence} in ('not_applicable','present','absent','unknown')`),
  check("issue_deletion_operations_fence_check", sql`${table.leaseFence} >= 0`),
  index("issue_deletion_operations_queue_idx").on(table.state, table.retryAt, table.createdAt),
  index("issue_deletion_operations_task_idx").on(table.taskId),
]);
