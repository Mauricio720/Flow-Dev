import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { taskPlanningDecisions } from "./planning";
import { tasks } from "./records";
import { taskTerminalSessions } from "./terminal";

export const taskRouteSwitches = pgTable("task_route_switches", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  planningDecisionId: uuid("planning_decision_id").notNull().references(() => taskPlanningDecisions.id, { onDelete: "restrict" }),
  sessionId: uuid("session_id").notNull().references(() => taskTerminalSessions.id, { onDelete: "cascade" }),
  fromRoute: text("from_route").notNull(),
  toRoute: text("to_route").notNull(),
  summary: text("summary").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull(),
  status: text("status").notNull().default("pending"),
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id, { onDelete: "restrict" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decisionRequestKey: uuid("decision_request_key"),
  proposedAt: timestamp("proposed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_route_switches_from_route_check", sql`${table.fromRoute} in ('prd','tech_spec')`),
  check("task_route_switches_to_route_check", sql`${table.toRoute} = 'direct_execution'`),
  check("task_route_switches_summary_check", sql`char_length(btrim(${table.summary})) between 1 and 500`),
  check("task_route_switches_reasons_check", sql`jsonb_typeof(${table.reasons}) = 'array' and jsonb_array_length(${table.reasons}) between 1 and 8`),
  check("task_route_switches_status_check", sql`${table.status} in ('pending','confirmed','declined')`),
  check("task_route_switches_decision_check", sql`(${table.status} = 'pending' and ${table.decidedByUserId} is null and ${table.decidedAt} is null and ${table.decisionRequestKey} is null) or (${table.status} in ('confirmed','declined') and ${table.decidedByUserId} is not null and ${table.decidedAt} is not null and ${table.decisionRequestKey} is not null)`),
  uniqueIndex("task_route_switches_session_pending_unique").on(table.sessionId).where(sql`${table.status} = 'pending'`),
  uniqueIndex("task_route_switches_decision_confirmed_unique").on(table.planningDecisionId).where(sql`${table.status} = 'confirmed'`),
  index("task_route_switches_task_proposed_idx").on(table.taskId, table.proposedAt),
]);
