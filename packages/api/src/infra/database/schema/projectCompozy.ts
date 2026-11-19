import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../schema";

export const projectCompozyBindings = pgTable("project_compozy_bindings", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
  checkoutPath: text("checkout_path").notNull(),
  compozyWorkspaceId: text("compozy_workspace_id"),
  state: text("state").notNull(),
  failureCode: text("failure_code"),
  defaultBranch: text("default_branch"),
  revision: integer("revision").notNull().default(1),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("project_compozy_bindings_state_check", sql`${table.state} in ('ready','invalid')`),
  check("project_compozy_bindings_revision_check", sql`${table.revision} > 0`),
  check("project_compozy_bindings_path_check", sql`char_length(${table.checkoutPath}) between 1 and 4096`),
  check("project_compozy_bindings_failure_check", sql`${table.failureCode} is null or ${table.failureCode} in ('checkout_not_found','checkout_not_git_root','checkout_remote_mismatch','default_branch_unknown')`),
  check("project_compozy_bindings_outcome_check", sql`(${table.state} = 'ready' and ${table.compozyWorkspaceId} is not null and ${table.defaultBranch} is not null and ${table.failureCode} is null) or (${table.state} = 'invalid' and ${table.compozyWorkspaceId} is null and ${table.failureCode} is not null)`),
]);
