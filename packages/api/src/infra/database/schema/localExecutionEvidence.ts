import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { taskExecutionRuns } from "./tasks/taskExecutionRuns";

export const taskRunGates = pgTable("task_run_gates", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => taskExecutionRuns.id, { onDelete: "cascade" }),
  gateId: text("gate_id").notNull(),
  attempt: integer("attempt").notNull(),
  manifestHash: text("manifest_hash").notNull(),
  required: boolean("required").notNull(),
  state: text("state").notNull(),
  reason: text("reason"),
  commandDigest: text("command_digest").notNull(),
  checkoutDigest: text("checkout_digest").notNull(),
  exitCode: integer("exit_code"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  executionId: text("execution_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("task_run_gates_attempt_unique").on(table.runId, table.gateId, table.attempt), index("task_run_gates_run_idx").on(table.runId), check("task_run_gates_state_check", sql`${table.state} IN ('passed','failed','blocked','unrun','unknown')`)]);

export const taskRunEvidence = pgTable("task_run_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => taskExecutionRuns.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  relativeLabel: text("relative_label").notNull(),
  visibility: text("visibility").notNull(),
  contentHash: text("content_hash").notNull(),
  byteSize: integer("byte_size").notNull(),
  safePayload: jsonb("safe_payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("task_run_evidence_run_idx").on(table.runId, table.createdAt), check("task_run_evidence_size_check", sql`${table.byteSize} BETWEEN 0 AND 262144`)]);
