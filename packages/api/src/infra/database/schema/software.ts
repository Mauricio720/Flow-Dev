import { bigint, boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../schema";
import { localMachines } from "./localMachines";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const softwareSettings = pgTable("software_settings", {
  id: integer("id").primaryKey().default(1),
  revision: integer("revision").notNull().default(0),
  enabled: boolean("enabled").notNull().default(false),
  docsProxyUrl: text("docs_proxy_url"),
  maxActiveActions: integer("max_active_actions").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt,
  updatedAt,
}, (table) => [
  check("software_settings_singleton_check", sql`${table.id} = 1`),
  check("software_settings_max_active_check", sql`${table.maxActiveActions} BETWEEN 1 AND 4`),
  check("software_settings_docs_proxy_check", sql`${table.docsProxyUrl} IS NULL OR ${table.docsProxyUrl} LIKE 'https://%'`),
  check("software_settings_enabled_check", sql`NOT ${table.enabled} OR ${table.docsProxyUrl} IS NOT NULL`),
]);

export const softwareConnections = pgTable("software_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  providerKind: text("provider_kind").notNull(),
  runtimeProviderId: text("runtime_provider_id").notNull().unique(),
  executionTarget: text("execution_target").notNull().default("host"),
  machineId: uuid("machine_id").references(() => localMachines.id, { onDelete: "cascade" }),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  modelCatalog: jsonb("model_catalog").$type<Array<{ modelId: string; displayName: string; selectable: boolean; unselectableReason: string | null; reasoningChoices: (string | null)[] }>>(),
  authState: text("auth_state").notNull().default("unconnected"),
  accountLabel: text("account_label"),
  accountFingerprint: text("account_fingerprint"),
  revision: integer("revision").notNull().default(1),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("software_connections_label_folded_unique").on(sql`lower(${table.label})`),
  check("software_connections_provider_check", sql`${table.providerKind} IN ('codex','claude')`),
  check("software_connections_target_check", sql`(${table.executionTarget} = 'host' AND ${table.machineId} IS NULL AND ${table.ownerUserId} IS NULL) OR (${table.executionTarget} = 'machine' AND ${table.machineId} IS NOT NULL AND ${table.ownerUserId} IS NOT NULL)`),
  check("software_connections_auth_state_check", sql`${table.authState} IN ('unconnected','pending','connected','failed','expired','disconnected','setup_required')`),
  index("software_connections_created_idx").on(table.createdAt, table.id),
]);

export const softwareAuthOperations = pgTable("software_auth_operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id").notNull().references(() => softwareConnections.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  state: text("state").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  nonceDigest: text("nonce_digest").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull().unique(),
  accountLabel: text("account_label"),
  accountFingerprint: text("account_fingerprint"),
  resultRevision: integer("result_revision"),
  failureCode: text("failure_code"),
  createdAt,
  updatedAt,
}, (table) => [
  check("software_auth_operations_kind_check", sql`${table.kind} IN ('codex_login','claude_login')`),
  check("software_auth_operations_state_check", sql`${table.state} IN ('pending','awaiting_confirmation','confirmed','failed','expired')`),
  uniqueIndex("software_auth_operations_active_unique").on(table.connectionId).where(sql`${table.state} IN ('pending','awaiting_confirmation')`),
]);

export const softwareAudit = pgTable("software_audit", {
  sequence: bigint("sequence", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  diff: jsonb("diff").$type<Record<string, unknown>>().notNull(),
  idempotencyKey: uuid("idempotency_key").unique(),
  requestHash: text("request_hash"),
  createdAt,
});
