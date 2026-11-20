import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { taskPlanningDecisions } from "./planning";
import { tasks } from "./records";

export const taskCompozyExecutions = pgTable("task_compozy_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  planningDecisionId: uuid("planning_decision_id").notNull().references(() => taskPlanningDecisions.id, { onDelete: "restrict" }),
  route: text("route").notNull(),
  state: text("state").notNull(),
  attempt: integer("attempt").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  compozyWorkspaceId: text("compozy_workspace_id").notNull(),
  specTaskId: text("spec_task_id"),
  specWorktreeId: text("spec_worktree_id"),
  specDir: text("spec_dir"),
  specRound: integer("spec_round").notNull().default(0),
  workTaskId: text("work_task_id"),
  branch: text("branch").notNull(),
  pullRequestUrl: text("pull_request_url"),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  failureCode: text("failure_code"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  startedBy: uuid("started_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("task_compozy_executions_request_unique").on(table.taskId, table.idempotencyKey),
  uniqueIndex("task_compozy_executions_attempt_unique").on(table.planningDecisionId, table.attempt),
  uniqueIndex("task_compozy_executions_active_unique").on(table.taskId).where(sql`${table.state} in ('dispatching','unavailable','spec_in_progress','spec_review','in_progress','needs_attention')`),
  index("task_compozy_executions_sync_idx").on(table.state, table.lastSyncedAt),
  check("task_compozy_executions_route_check", sql`${table.route} in ('direct_execution','tech_spec','prd')`),
  check("task_compozy_executions_state_check", sql`${table.state} in ('dispatching','unavailable','spec_in_progress','spec_review','in_progress','needs_attention','completed','failed','canceled','rejected')`),
  check("task_compozy_executions_attempt_check", sql`${table.attempt} > 0`),
  check("task_compozy_executions_spec_round_check", sql`${table.specRound} >= 0`),
  check("task_compozy_executions_detail_check", sql`jsonb_typeof(${table.detail}) = 'object'`),
]);

export const taskCompozySpecReviews = pgTable("task_compozy_spec_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  executionId: uuid("execution_id").notNull().references(() => taskCompozyExecutions.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  decision: text("decision").notNull(),
  note: text("note"),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  idempotencyKey: uuid("idempotency_key").notNull().unique("task_compozy_spec_reviews_idempotency_key_unique"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("task_compozy_spec_reviews_round_unique").on(table.executionId, table.round),
  check("task_compozy_spec_reviews_decision_check", sql`${table.decision} in ('approve','request_changes','reject')`),
  check("task_compozy_spec_reviews_round_check", sql`${table.round} > 0`),
  check("task_compozy_spec_reviews_note_check", sql`(${table.note} is null or char_length(${table.note}) between 1 and 4000) and (${table.decision} <> 'request_changes' or ${table.note} is not null)`),
]);
