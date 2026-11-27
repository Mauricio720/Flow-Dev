import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../schema";
import { tasks } from "./tasks/records";
import type { CodexStatus } from "../../../application/terminal/codexCatalog";

export const agentAccounts = pgTable("agent_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  hostId: text("host_id").notNull(),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("pending_login"),
  identity: text("identity"),
  plan: text("plan"),
  codexCatalog: jsonb("codex_catalog").$type<CodexStatus>(),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("agent_accounts_provider_check", sql`${table.provider} in ('claude','codex')`),
  check("agent_accounts_label_check", sql`char_length(btrim(${table.label})) between 1 and 40`),
  check("agent_accounts_status_check", sql`${table.status} in ('pending_login','logged_in','logged_out','check_failed')`),
  check("agent_accounts_version_check", sql`${table.version} >= 1`),
  uniqueIndex("agent_accounts_active_label_unique").on(table.ownerUserId, table.hostId, table.provider, sql`lower(${table.label})`).where(sql`${table.removedAt} is null`),
  index("agent_accounts_owner_host_idx").on(table.ownerUserId, table.hostId).where(sql`${table.removedAt} is null`),
]);

export const taskAgentAccounts = pgTable("task_agent_accounts", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  accountId: uuid("account_id").notNull().references(() => agentAccounts.id, { onDelete: "restrict" }),
  chosenBy: uuid("chosen_by").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.provider], name: "task_agent_accounts_pkey" }),
  check("task_agent_accounts_provider_check", sql`${table.provider} in ('claude','codex')`),
  check("task_agent_accounts_version_check", sql`${table.version} >= 1`),
]);
