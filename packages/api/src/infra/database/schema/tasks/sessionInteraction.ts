import { boolean, check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { taskTerminalSessions } from "./terminal";

export const terminalSessionHosts = pgTable("terminal_session_hosts", {
  hostId: text("host_id").primaryKey(),
  workerId: text("worker_id").notNull(),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskTerminalMessages = pgTable("task_terminal_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => taskTerminalSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  truncated: boolean("truncated").notNull().default(false),
  requestKey: uuid("request_key"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  undelivered: boolean("undelivered").notNull().default(false),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_terminal_messages_role_check", sql`${table.role} in ('user','assistant','system')`),
  check("task_terminal_messages_content_check", sql`char_length(${table.content}) <= 50000`),
  uniqueIndex("task_terminal_messages_session_request_key_unique").on(table.sessionId, table.requestKey),
  index("task_terminal_messages_session_occurred_idx").on(table.sessionId, table.occurredAt),
  index("task_terminal_messages_queue_idx").on(table.sessionId, table.occurredAt).where(sql`${table.role} = 'user' and ${table.deliveredAt} is null and ${table.undelivered} = false`),
]);

export const taskTerminalRequests = pgTable("task_terminal_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => taskTerminalSessions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  toolUseId: text("tool_use_id").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  answer: jsonb("answer"),
  answeredBy: uuid("answered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
}, (table) => [
  check("task_terminal_requests_kind_check", sql`${table.kind} in ('question','permission')`),
  check("task_terminal_requests_status_check", sql`${table.status} in ('pending','answered','cancelled')`),
  index("task_terminal_requests_session_status_idx").on(table.sessionId, table.status),
]);
