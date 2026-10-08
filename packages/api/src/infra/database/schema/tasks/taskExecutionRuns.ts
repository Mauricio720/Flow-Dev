import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { RunActivity } from "../../../../application/database/dao/taskFlowTypes";
import { users } from "../../schema";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const taskExecutionRuns = pgTable("task_execution_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionId: uuid("action_id").notNull(),
  taskId: uuid("task_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  state: text("state").notNull().default("queued"),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  worktreeId: text("worktree_id"),
  connectionIds: uuid("connection_ids").array().notNull().default(sql`'{}'::uuid[]`),
  isWrite: boolean("is_write").notNull().default(true),
  leaseOwner: text("lease_owner"),
  leaseFence: integer("lease_fence").notNull().default(0),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  idempotencyKey: uuid("idempotency_key").notNull(),
  requestedBy: uuid("requested_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  terminalCode: text("terminal_code"),
  runtimeWorkspaceId: text("runtime_workspace_id"),
  runtimeSessionId: text("runtime_session_id"),
  runtimeTurnId: text("runtime_turn_id"),
  runtimeRunId: text("runtime_run_id"),
  runtimeEventSequence: integer("runtime_event_sequence").notNull().default(0),
  activity: jsonb("activity").$type<RunActivity | null>(),
  createdAt,
  updatedAt,
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [
  unique("task_execution_runs_attempt_unique").on(table.actionId, table.attemptNumber),
  unique("task_execution_runs_key_unique").on(table.taskId, table.idempotencyKey),
  uniqueIndex("task_execution_runs_active_write_idx").on(table.taskId).where(sql`${table.isWrite} AND ${table.state} IN ('queued','dispatching','running','waiting','finalizing','stopping','reconciling')`),
  check("task_execution_runs_state_check", sql`${table.state} IN ('queued','dispatching','running','waiting','finalizing','stopping','reconciling','succeeded','failed','canceled','blocked','stalled','exhausted','unknown')`),
  index("task_execution_runs_worktree_idx").on(table.worktreeId),
  index("task_execution_runs_task_idx").on(table.taskId, table.createdAt),
]);
