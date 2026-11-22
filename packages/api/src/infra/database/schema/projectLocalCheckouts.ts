import { check, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../schema";

export const projectLocalCheckouts = pgTable("project_local_checkouts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.projectId], name: "project_local_checkouts_user_id_project_id_pk" }),
  check("project_local_checkouts_path_check", sql`char_length(${table.path}) between 1 and 1024`),
  check("project_local_checkouts_version_check", sql`${table.version} >= 1`),
]);
