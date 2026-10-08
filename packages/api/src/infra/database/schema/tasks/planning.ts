import { check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../../schema";
import { taskOperations } from "./operations";
import { taskPublicationAttempts } from "./boundaries";
import { tasks } from "./records";

export const taskPlanningDecisions = pgTable("task_planning_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  publicationAttemptId: uuid("publication_attempt_id").references(() => taskPublicationAttempts.id, { onDelete: "restrict" }),
  sourceSnapshotId: uuid("source_snapshot_id"),
  requesterUserId: uuid("requester_user_id").references(() => users.id, { onDelete: "restrict" }),
  sourceFormatVersion: integer("source_format_version").notNull().default(1),
  operationId: uuid("operation_id").notNull().references(() => taskOperations.id, { onDelete: "restrict" }),
  executionId: uuid("execution_id").notNull(),
  version: integer("version").notNull().default(1),
  recommendedRoute: text("recommended_route").notNull(),
  selectedRoute: text("selected_route").notNull(),
  decisionSource: text("decision_source").notNull(),
  complexity: text("complexity").notNull(),
  summary: text("summary").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull(),
  uncertainties: jsonb("uncertainties").$type<string[]>().notNull(),
  status: text("status").notNull().default("review"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "restrict" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("task_planning_decisions_operation_unique").on(table.operationId),
  check("task_planning_decisions_version_check", sql`${table.version} > 0`),
  check("task_planning_decisions_route_check", sql`${table.recommendedRoute} in ('direct_execution','tech_spec','prd') and ${table.selectedRoute} in ('direct_execution','tech_spec','prd')`),
  check("task_planning_decisions_source_check", sql`(${table.decisionSource} = 'AI' and ${table.recommendedRoute} = ${table.selectedRoute}) or (${table.decisionSource} = 'HUMAN_OVERRIDE' and ${table.recommendedRoute} <> ${table.selectedRoute})`),
  check("task_planning_decisions_complexity_check", sql`${table.complexity} in ('low','medium','high')`),
  check("task_planning_decisions_content_check", sql`length(btrim(${table.summary})) > 0 and jsonb_typeof(${table.reasons}) = 'array' and jsonb_array_length(${table.reasons}) between 1 and 20 and jsonb_typeof(${table.uncertainties}) = 'array' and jsonb_array_length(${table.uncertainties}) between 0 and 20`),
  check("task_planning_decisions_status_check", sql`(${table.status} = 'review' and ${table.approvedByUserId} is null and ${table.approvedAt} is null) or (${table.status} = 'approved' and ${table.approvedByUserId} is not null and ${table.approvedAt} is not null)`),
]);
