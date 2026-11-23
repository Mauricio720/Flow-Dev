import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../../schema";
import { taskImages } from "./images";
import { taskPlanningDecisions } from "./planning";
import { tasks } from "./records";

export const taskTerminalSessions = pgTable("task_terminal_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  planningDecisionId: uuid("planning_decision_id").notNull().references(() => taskPlanningDecisions.id, { onDelete: "restrict" }),
  route: text("route").notNull(),
  requestKey: uuid("request_key").notNull(),
  checkoutPath: text("checkout_path").notNull(),
  branch: text("branch"),
  dirty: boolean("dirty").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignalAt: timestamp("last_signal_at", { withTimezone: true }).defaultNow().notNull(),
  filesRemovedAt: timestamp("files_removed_at", { withTimezone: true }),
  launchFailedAt: timestamp("launch_failed_at", { withTimezone: true }),
  launchError: text("launch_error"),
  status: text("status").notNull().default("opening"),
  tokenHash: text("token_hash").unique(),
  claudeSessionId: text("claude_session_id"),
  endReason: text("end_reason"),
  activeSkill: text("active_skill"),
  droppedEvents: integer("dropped_events").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  lastCaptureAt: timestamp("last_capture_at", { withTimezone: true }),
}, (table) => [
  check("task_terminal_sessions_route_check", sql`${table.route} in ('direct_execution','tech_spec','prd')`),
  check("task_terminal_sessions_status_check", sql`${table.status} in ('opening','running','waiting','unconfirmed','ended','launch_failed')`),
  uniqueIndex("task_terminal_sessions_request_key_unique").on(table.userId, table.requestKey),
  index("task_terminal_sessions_task_opened_idx").on(table.taskId, table.openedAt.desc()),
]);

export const taskTerminalAttachments = pgTable("task_terminal_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  sessionId: uuid("session_id").references(() => taskTerminalSessions.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(),
  taskImageId: uuid("task_image_id").references(() => taskImages.id, { onDelete: "set null" }),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_terminal_attachments_origin_check", sql`${table.origin} in ('upload','issue_image')`),
  check("task_terminal_attachments_name_check", sql`char_length(${table.originalName}) between 1 and 255`),
  check("task_terminal_attachments_size_check", sql`${table.byteSize} between 1 and 10485760`),
  uniqueIndex("task_terminal_attachments_staged_sha_unique").on(table.userId, table.taskId, table.sha256).where(sql`${table.sessionId} is null`),
  index("task_terminal_attachments_session_idx").on(table.sessionId),
]);
