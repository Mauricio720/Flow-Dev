import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, users } from "../schema";
import type { LoopDefinition } from "../../../application/software/compozyControlGateway";

export const localMachines = pgTable("local_machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  credentialHash: text("credential_hash").notNull(),
  credentialGeneration: integer("credential_generation").notNull().default(1),
  credentialExpiresAt: timestamp("credential_expires_at", { withTimezone: true }).notNull(),
  pendingCredentialHash: text("pending_credential_hash"),
  pendingCredentialCiphertext: text("pending_credential_ciphertext"),
  pendingCredentialGeneration: integer("pending_credential_generation"),
  pendingCredentialExpiresAt: timestamp("pending_credential_expires_at", { withTimezone: true }),
  pendingCredentialRequestKey: uuid("pending_credential_request_key"),
  previousCredentialHash: text("previous_credential_hash"),
  previousCredentialExpiresAt: timestamp("previous_credential_expires_at", { withTimezone: true }),
  protocolVersion: integer("protocol_version").notNull().default(1),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  catalogRevision: integer("catalog_revision").notNull().default(0),
  providerCatalog: jsonb("provider_catalog").$type<Array<{ providerId: string; providerKind: "codex" | "claude"; label: string; models: Array<{ modelId: string; displayName: string; selectable: boolean; unselectableReason: string | null; reasoningChoices: (string | null)[] }> }>>().notNull().default([]),
  loopCatalog: jsonb("loop_catalog").$type<LoopDefinition[]>().notNull().default([]),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  lastHeartbeatRequestKey: uuid("last_heartbeat_request_key"),
  lastHeartbeatPayloadHash: text("last_heartbeat_payload_hash"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revocationRequestKey: uuid("revocation_request_key"),
  revocationPayloadHash: text("revocation_payload_hash"),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("local_machines_owner_idx").on(table.ownerUserId, table.createdAt), check("local_machines_protocol_check", sql`${table.protocolVersion} > 0`)]);

export const localPairings = pgTable("local_pairings", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  machineId: uuid("machine_id").references(() => localMachines.id, { onDelete: "cascade" }),
  publicCodeHash: text("public_code_hash").notNull().unique(),
  pollingSecretHash: text("polling_secret_hash").notNull(),
  safeLabel: text("safe_label").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  requestKey: uuid("request_key"),
  pendingCredentialCiphertext: text("pending_credential_ciphertext"),
  exchangeRequestKey: uuid("exchange_request_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("local_pairings_expiry_idx").on(table.expiresAt), uniqueIndex("local_pairings_request_key_unique").on(table.ownerUserId, table.requestKey)]);

export const localProjectLinks = pgTable("local_project_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  machineId: uuid("machine_id").notNull().references(() => localMachines.id, { onDelete: "restrict" }),
  checkoutHandle: text("checkout_handle").notNull(),
  checkoutKey: text("checkout_key").notNull(),
  repositoryId: text("repository_id").notNull(),
  repositoryNodeId: text("repository_node_id").notNull(),
  safeLabel: text("safe_label").notNull(),
  revision: integer("revision").notNull().default(1),
  readiness: text("readiness").notNull().default("unknown"),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  lastRequestKey: uuid("last_request_key"),
  lastRequestPayloadHash: text("last_request_payload_hash"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("local_project_links_current_unique").on(table.ownerUserId, table.projectId).where(sql`${table.revokedAt} IS NULL`), index("local_project_links_machine_idx").on(table.machineId), check("local_project_links_revision_check", sql`${table.revision} > 0`)]);
