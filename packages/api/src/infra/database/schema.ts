import { bigint, boolean, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
  githubRepositoryId: text("github_repository_id").notNull(),
  githubNodeId: text("github_node_id").notNull(),
  repositoryOwner: text("repository_owner").notNull(),
  repositoryName: text("repository_name").notNull(),
  repositoryVisibility: text("repository_visibility").notNull(),
  repositoryArchived: boolean("repository_archived").default(false).notNull(),
  repositoryVerifiedAt: timestamp("repository_verified_at", { withTimezone: true }).notNull(),
  detailsVersion: integer("details_version").default(1).notNull(),
  githubProjectNodeId: text("github_project_node_id"),
  githubProjectUrl: text("github_project_url"),
  githubProjectTitle: text("github_project_title"),
  ...timestamps,
}, (table) => [unique("projects_github_repository_id_unique").on(table.githubRepositoryId), unique("projects_github_node_id_unique").on(table.githubNodeId), index("projects_created_id_idx").on(table.createdAt, table.id)]);
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
  id: uuid("id").defaultRandom().primaryKey(), key: text("key").notNull().unique(), count: integer("count").default(0).notNull(), lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const githubRepositoryAuthorizations = pgTable("github_repository_authorizations", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  githubUserId: text("github_user_id").notNull(),
  accessTokenCiphertext: text("access_token_ciphertext").notNull(),
  refreshTokenCiphertext: text("refresh_token_ciphertext"),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
  grantedScopes: text("granted_scopes").array().notNull(),
  keyVersion: integer("key_version").default(1).notNull(),
  ...timestamps,
});
export const githubRepositoryOAuthStates = pgTable("github_repository_oauth_states", {
  stateHash: text("state_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionIdHash: text("session_id_hash").notNull(),
  codeVerifierCiphertext: text("code_verifier_ciphertext").notNull(),
  returnTo: text("return_to").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("github_oauth_states_expiry_idx").on(table.expiresAt)]);
export type ProjectRow = typeof projects.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type RepositoryAuthorizationRow = typeof githubRepositoryAuthorizations.$inferSelect;
export type RepositoryOAuthStateRow = typeof githubRepositoryOAuthStates.$inferSelect;
export { taskCommandReceipts, taskDraftRevisions, taskMessages, taskRepositorySnapshot, tasks } from "./schema/tasks/records";
export { taskCaptureLeases, taskContextCapabilities, taskPublicationAttempts } from "./schema/tasks/boundaries";
export { taskEvidence, taskOperations, taskToolActivity, taskToolCalls } from "./schema/tasks/operations";
export { taskPlanningDecisions } from "./schema/tasks/planning";
export { taskSpecAttempts, taskSpecStages, taskSpecWorkflows, taskSpecWorkspaces } from "./schema/tasks/spec";
export { taskSpecCommands } from "./schema/tasks/specCommands";
export { taskSpecEvents, taskSpecInteractions } from "./schema/tasks/specRuntime";
export { taskSpecApprovals, taskSpecDocuments, taskSpecFinalizations, taskSpecPackages } from "./schema/tasks/specPackages";
export { softwareAudit, softwareAuthOperations, softwareConnections, softwareSettings } from "./schema/software";
export { taskExecutionPlans, taskExecutionPlanSaves } from "./schema/tasks/taskExecutionPlans";
export { taskExecutionActions, taskExecutionRuntimeBindings } from "./schema/tasks/taskExecution";
export { taskExecutionRuns } from "./schema/tasks/taskExecutionRuns";
export { taskUnifiedPackageApprovals, taskUnifiedPackageFiles, taskUnifiedPackages } from "./schema/tasks/taskUnifiedPackages";
export { taskIssueClaimAttempts, taskIssueClaims, taskIssueSnapshots, taskIssueSources } from "./schema/tasks/sources";
export { localMachines, localPairings, localProjectLinks } from "./schema/localMachines";
export { localCommandEvents, localCommands } from "./schema/localCommands";
export { localCheckoutLocks } from "./schema/localCheckoutLocks";
export { taskRunEvidence, taskRunGates } from "./schema/localExecutionEvidence";
export { localLinkRequests } from "./schema/localLinkRequests";
