import { boolean, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalKey: text("external_key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isDemo: boolean("is_demo").default(false).notNull(),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  lastProjectId: uuid("last_project_id").references(() => projects.id, { onDelete: "set null" }),
  lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
  ...timestamps,
});

export const projectAssignments = pgTable("project_assignments", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.projectId] }), index("assignment_project_idx").on(table.projectId)]);

export const adminDesignations = pgTable("admin_designations", {
  githubUserId: text("github_user_id").primaryKey(),
  resolvedLogin: text("resolved_login").notNull(),
  designatedAt: timestamp("designated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
}, (table) => [unique("account_provider_key").on(table.providerId, table.accountId)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

export const verification = pgTable("verification", {
  id: uuid("id").defaultRandom().primaryKey(), identifier: text("identifier").notNull(),
  value: text("value").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), ...timestamps,
});

export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").defaultRandom().primaryKey(), key: text("key").notNull().unique(), count: integer("count").default(0).notNull(), lastRequest: timestamp("last_request", { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type UserRow = typeof users.$inferSelect;
