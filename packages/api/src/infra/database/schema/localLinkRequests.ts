import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../schema";
import { localMachines } from "./localMachines";

export const localLinkRequests = pgTable("local_link_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  machineId: uuid("machine_id").references(() => localMachines.id, { onDelete: "set null" }),
  expectedRevision: integer("expected_revision").notNull(),
  state: text("state").notNull().default("pending"),
  reason: text("reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("local_link_requests_owner_idx").on(table.ownerUserId, table.createdAt),
  check("local_link_requests_state_check", sql`${table.state} IN ('pending', 'claimed', 'linked', 'failed')`),
  check("local_link_requests_revision_check", sql`${table.expectedRevision} >= 0`),
]);
