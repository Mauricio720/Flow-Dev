import { bigint, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { taskSpecAttempts, taskSpecWorkflows } from "./spec";
import { taskSpecCommands } from "./specCommands";

export const taskSpecInteractions = pgTable("task_spec_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  attemptId: uuid("attempt_id").notNull().references(() => taskSpecAttempts.id, { onDelete: "restrict" }),
  runtimeSessionId: text("runtime_session_id").notNull(),
  runtimeTurnId: text("runtime_turn_id").notNull(),
  runtimeInteractionId: text("runtime_interaction_id").notNull(),
  providerRequestId: text("provider_request_id").notNull(),
  kind: text("kind").notNull(),
  description: text("description").notNull(),
  choices: jsonb("choices").$type<string[] | null>(),
  target: jsonb("target").$type<Record<string, unknown> | null>(),
  targetDigest: text("target_digest"),
  status: text("status").notNull().default("pending"),
  winningCommandId: uuid("winning_command_id").references(() => taskSpecCommands.id, { onDelete: "restrict" }),
  response: jsonb("response").$type<Record<string, unknown> | null>(),
  delivery: text("delivery").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [unique("task_spec_interactions_runtime_unique").on(table.attemptId, table.runtimeInteractionId)]);

export const taskSpecEvents = pgTable("task_spec_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
  attemptId: uuid("attempt_id").notNull().references(() => taskSpecAttempts.id, { onDelete: "restrict" }),
  runtimeSessionId: text("runtime_session_id"),
  runtimeGeneration: text("runtime_generation"),
  runtimeSequence: bigint("runtime_sequence", { mode: "number" }),
  providerEventId: text("provider_event_id"),
  kind: text("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
  emittedAt: timestamp("emitted_at", { withTimezone: true }),
}, (table) => [unique("task_spec_events_sequence_unique").on(table.workflowId, table.sequence), uniqueIndex("task_spec_events_provider_unique").on(table.attemptId, table.providerEventId).where(sql`${table.providerEventId} is not null`)]);
