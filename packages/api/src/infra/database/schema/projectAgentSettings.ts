import { check, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../schema";

export const projectAgentSettings = pgTable("project_agent_settings", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  effort: text("effort").notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.agent], name: "project_agent_settings_project_id_agent_pk" }),
  check("project_agent_settings_agent_check", sql`${table.agent} in ('issue_author','planning')`),
  check("project_agent_settings_provider_check", sql`${table.provider} in ('claude','codex')`),
  check("project_agent_settings_effort_check", sql`${table.effort} in ('low','medium','high')`),
  check("project_agent_settings_model_check", sql`char_length(${table.model}) between 1 and 64`),
  check("project_agent_settings_version_check", sql`${table.version} >= 1`),
]);
