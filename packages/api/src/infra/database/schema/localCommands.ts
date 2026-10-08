import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { localMachines, localProjectLinks } from "./localMachines";
import { projects, users } from "../schema";
import { taskExecutionRuns } from "./tasks/taskExecutionRuns";
import type { LocalCommand } from "../../../application/services/local-execution/localProtocol";

export const localCommands = pgTable("local_commands", {
  id: uuid("id").defaultRandom().primaryKey(),
  machineId: uuid("machine_id").notNull().references(() => localMachines.id, { onDelete: "restrict" }),
  linkId: uuid("link_id").notNull().references(() => localProjectLinks.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  runId: uuid("run_id").references(() => taskExecutionRuns.id, { onDelete: "restrict" }),
  preparationId: uuid("preparation_id"),
  protocolVersion: integer("protocol_version").notNull().default(1),
  target: jsonb("target").$type<LocalCommand["target"]>().notNull(),
  requestKey: uuid("request_key").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  payloadHash: text("payload_hash").notNull(),
  fence: integer("fence").notNull(),
  sequence: integer("sequence").notNull().default(0),
  state: text("state").notNull().default("queued"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("local_commands_run_start_unique").on(table.runId).where(sql`${table.kind} = 'start'`),
  uniqueIndex("local_commands_machine_request_unique").on(table.machineId, table.requestKey),
  index("local_commands_poll_idx").on(table.machineId, table.state, table.createdAt),
  check("local_commands_operation_check", sql`(${table.runId} IS NULL) <> (${table.preparationId} IS NULL)`),
  check("local_commands_kind_check", sql`${table.kind} IN ('prepare','start','inspect','cancel','answer')`),
  check("local_commands_protocol_check", sql`${table.protocolVersion} > 0`),
  check("local_commands_fence_check", sql`${table.fence} > 0`),
  check("local_commands_state_check", sql`${table.state} IN ('queued','leased','accepted','completed','expired')`),
]);

export const localCommandEvents = pgTable("local_command_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  commandId: uuid("command_id").notNull().references(() => localCommands.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  kind: text("kind").notNull(),
  payloadHash: text("payload_hash").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("local_command_events_sequence_unique").on(table.commandId, table.sequence)]);
