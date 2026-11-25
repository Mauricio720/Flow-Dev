import { boolean, check, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../../schema";
import { taskArtifactVersions } from "./artifacts";
import { tasks } from "./records";
import { taskTerminalSessions } from "./terminal";

export const taskReviewCycles = pgTable("task_review_cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  hostId: text("host_id").notNull(),
  startedBy: uuid("started_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  requestKey: uuid("request_key").notNull(),
  reviewerAgent: text("reviewer_agent").notNull(),
  reviewerModel: text("reviewer_model").notNull(),
  reviewerEffort: text("reviewer_effort").notNull(),
  executorAgent: text("executor_agent").notNull(),
  executorModel: text("executor_model").notNull(),
  executorEffort: text("executor_effort").notNull(),
  reviewSessionId: uuid("review_session_id").references((): AnyPgColumn => taskTerminalSessions.id, { onDelete: "set null" }),
  executeSessionId: uuid("execute_session_id").references((): AnyPgColumn => taskTerminalSessions.id, { onDelete: "set null" }),
  tasksFolder: text("tasks_folder").notNull(),
  partial: boolean("partial").notNull(),
  state: text("state").notNull().default("reviewing"),
  round: integer("round").notNull().default(1),
  attempt: integer("attempt").notNull().default(1),
  revision: integer("revision").notNull().default(1),
  stepRole: text("step_role").notNull().default("review"),
  stepStartedAt: timestamp("step_started_at", { withTimezone: true }),
  pendingAction: text("pending_action"),
  pendingBy: uuid("pending_by").references(() => users.id, { onDelete: "set null" }),
  pendingAt: timestamp("pending_at", { withTimezone: true }),
  failure: text("failure"),
  stopReason: text("stop_reason"),
  endedBy: uuid("ended_by").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (table) => [
  check("task_review_cycles_state_check", sql`${table.state} in ('reviewing','executing','caveats','failed','approved','accepted','stopped')`),
  check("task_review_cycles_step_role_check", sql`${table.stepRole} in ('review','execute')`),
  check("task_review_cycles_reviewer_agent_check", sql`${table.reviewerAgent} in ('claude','codex')`),
  check("task_review_cycles_reviewer_model_check", sql`char_length(${table.reviewerModel}) between 1 and 64`),
  check("task_review_cycles_reviewer_effort_check", sql`char_length(${table.reviewerEffort}) between 1 and 64`),
  check("task_review_cycles_executor_agent_check", sql`${table.executorAgent} in ('claude','codex')`),
  check("task_review_cycles_executor_model_check", sql`char_length(${table.executorModel}) between 1 and 64`),
  check("task_review_cycles_executor_effort_check", sql`char_length(${table.executorEffort}) between 1 and 64`),
  check("task_review_cycles_round_check", sql`${table.round} >= 1`),
  check("task_review_cycles_attempt_check", sql`${table.attempt} >= 1`),
  check("task_review_cycles_revision_check", sql`${table.revision} >= 1`),
  check("task_review_cycles_pending_action_check", sql`${table.pendingAction} is null or ${table.pendingAction} in ('stop','retry','accept','fix')`),
  unique("task_review_cycles_started_by_request_key_unique").on(table.startedBy, table.requestKey),
  uniqueIndex("task_review_cycles_task_active_unique").on(table.taskId).where(sql`${table.state} in ('reviewing','executing','caveats','failed')`),
  index("task_review_cycles_host_state_idx").on(table.hostId, table.state),
]);

export const taskReviewRounds = pgTable("task_review_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  cycleId: uuid("cycle_id").notNull().references(() => taskReviewCycles.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  reviewSessionId: uuid("review_session_id").references((): AnyPgColumn => taskTerminalSessions.id, { onDelete: "set null" }),
  executeSessionId: uuid("execute_session_id").references((): AnyPgColumn => taskTerminalSessions.id, { onDelete: "set null" }),
  verdict: text("verdict"),
  reportPath: text("report_path"),
  reportVersionId: uuid("report_version_id").references(() => taskArtifactVersions.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
}, (table) => [
  check("task_review_rounds_number_check", sql`${table.number} >= 1`),
  check("task_review_rounds_verdict_check", sql`${table.verdict} is null or ${table.verdict} in ('approved','caveats','rejected')`),
  unique("task_review_rounds_cycle_number_unique").on(table.cycleId, table.number),
]);
