import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { softwareConnections } from "../software";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const taskExecutionActions = pgTable("task_execution_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull(),
  taskId: uuid("task_id").notNull(),
  position: integer("position").notNull(),
  kind: text("kind").notNull(),
  loopName: text("loop_name"),
  loopVersion: text("loop_version"),
  inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull().default({}),
  workspaceKind: text("workspace_kind").notNull().default("isolated"),
  worktreeId: text("worktree_id"),
  worktreeName: text("worktree_name"),
  localMachineId: uuid("local_machine_id"),
  localLinkId: uuid("local_link_id"),
  localLinkRevision: integer("local_link_revision"),
  localCheckoutHandle: text("local_checkout_handle"),
  state: text("state").notNull().default("planned"),
  createdAt,
  updatedAt,
}, (table) => [
  unique("task_execution_actions_position_unique").on(table.planId, table.position),
  unique("task_execution_actions_id_task_unique").on(table.id, table.taskId),
  check("task_execution_actions_kind_check", sql`${table.kind} IN ('create_spec','create_tasks','loop')`),
  check("task_execution_actions_loop_check", sql`(${table.kind} = 'loop') = (${table.loopName} IS NOT NULL AND ${table.loopVersion} IS NOT NULL)`),
  check("task_execution_actions_workspace_check", sql`${table.workspaceKind} IN ('isolated','existing','new','local') AND ((${table.workspaceKind} = 'existing') = (${table.worktreeId} IS NOT NULL)) AND ((${table.workspaceKind} = 'new') = (${table.worktreeName} IS NOT NULL)) AND ((${table.workspaceKind} = 'local') = (${table.localMachineId} IS NOT NULL AND ${table.localLinkId} IS NOT NULL AND ${table.localLinkRevision} IS NOT NULL AND ${table.localCheckoutHandle} IS NOT NULL)) AND (${table.workspaceKind} = 'local' OR (${table.localMachineId} IS NULL AND ${table.localLinkId} IS NULL AND ${table.localLinkRevision} IS NULL AND ${table.localCheckoutHandle} IS NULL))`),
  check("task_execution_actions_state_check", sql`${table.state} IN ('planned','queued','running','succeeded','failed','canceled','blocked','reconciling')`),
  index("task_execution_actions_task_idx").on(table.taskId, table.position),
]);

export const taskExecutionRuntimeBindings = pgTable("task_execution_runtime_bindings", {
  actionId: uuid("action_id").notNull().references(() => taskExecutionActions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  connectionId: uuid("connection_id").notNull().references(() => softwareConnections.id, { onDelete: "restrict" }),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  reasoningEffort: text("reasoning_effort"),
}, (table) => [primaryKey({ columns: [table.actionId, table.role] }), index("task_execution_bindings_connection_idx").on(table.connectionId)]);
