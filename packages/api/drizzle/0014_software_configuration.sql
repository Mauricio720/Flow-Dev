CREATE TABLE "software_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "revision" integer DEFAULT 0 NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "docs_proxy_url" text,
  "max_active_actions" integer DEFAULT 1 NOT NULL,
  "updated_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "software_settings_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "software_settings_max_active_check" CHECK ("max_active_actions" BETWEEN 1 AND 4),
  CONSTRAINT "software_settings_docs_proxy_check" CHECK ("docs_proxy_url" IS NULL OR "docs_proxy_url" LIKE 'https://%'),
  CONSTRAINT "software_settings_enabled_check" CHECK (NOT "enabled" OR "docs_proxy_url" IS NOT NULL),
  CONSTRAINT "software_settings_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO "software_settings" ("id") VALUES (1);
--> statement-breakpoint
CREATE TABLE "software_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "label" text NOT NULL,
  "provider_kind" text NOT NULL,
  "runtime_provider_id" text NOT NULL,
  "auth_state" text DEFAULT 'unconnected' NOT NULL,
  "account_label" text,
  "account_fingerprint" text,
  "revision" integer DEFAULT 1 NOT NULL,
  "last_checked_at" timestamptz,
  "disabled_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "software_connections_runtime_provider_id_unique" UNIQUE ("runtime_provider_id"),
  CONSTRAINT "software_connections_provider_check" CHECK ("provider_kind" IN ('codex','claude')),
  CONSTRAINT "software_connections_auth_state_check" CHECK ("auth_state" IN ('unconnected','pending','connected','failed','expired','disconnected','setup_required')),
  CONSTRAINT "software_connections_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "software_connections_label_folded_unique" ON "software_connections" (lower("label"));
--> statement-breakpoint
CREATE INDEX "software_connections_created_idx" ON "software_connections" ("created_at", "id");
--> statement-breakpoint
CREATE TABLE "software_auth_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connection_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "state" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "actor_id" uuid NOT NULL,
  "nonce_digest" text NOT NULL,
  "idempotency_key" uuid NOT NULL,
  "account_label" text,
  "account_fingerprint" text,
  "result_revision" integer,
  "failure_code" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "software_auth_operations_idempotency_key_unique" UNIQUE ("idempotency_key"),
  CONSTRAINT "software_auth_operations_kind_check" CHECK ("kind" IN ('codex_login','claude_login')),
  CONSTRAINT "software_auth_operations_state_check" CHECK ("state" IN ('pending','awaiting_confirmation','confirmed','failed','expired')),
  CONSTRAINT "software_auth_operations_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "software_connections" ("id") ON DELETE RESTRICT,
  CONSTRAINT "software_auth_operations_actor_fk" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "software_auth_operations_active_unique" ON "software_auth_operations" ("connection_id") WHERE "state" IN ('pending','awaiting_confirmation');
--> statement-breakpoint
CREATE TABLE "software_audit" (
  "sequence" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid,
  "event" text NOT NULL,
  "diff" jsonb NOT NULL,
  "idempotency_key" uuid,
  "request_hash" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "software_audit_id_unique" UNIQUE ("id"),
  CONSTRAINT "software_audit_idempotency_key_unique" UNIQUE ("idempotency_key"),
  CONSTRAINT "software_audit_actor_fk" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE SET NULL
);
