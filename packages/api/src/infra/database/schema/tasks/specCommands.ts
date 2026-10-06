import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { projects, users } from "../../schema";
import { tasks } from "./records";
import { taskSpecWorkflows } from "./spec";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const taskSpecCommands = pgTable("task_spec_commands", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  workflowId: uuid("workflow_id").references(() => taskSpecWorkflows.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  requestKey: uuid("request_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  expectedVersion: integer("expected_version").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("accepted"),
  specVersion: integer("spec_version").notNull(),
  attemptId: uuid("attempt_id"),
  packageId: uuid("package_id"),
  deliveryStatus: text("delivery_status").notNull().default("pending"),
  reason: text("reason"),
  leaseOwner: text("lease_owner"),
  leaseFence: integer("lease_fence").notNull().default(0),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [unique("task_spec_commands_request_unique").on(table.actorUserId, table.requestKey), index("task_spec_commands_workflow_idx").on(table.workflowId, table.createdAt)]);
