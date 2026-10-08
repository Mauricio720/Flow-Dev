CREATE TABLE "local_machines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "label" text NOT NULL,
  "credential_hash" text NOT NULL,
  "credential_generation" integer DEFAULT 1 NOT NULL,
  "credential_expires_at" timestamp with time zone NOT NULL,
  "protocol_version" integer DEFAULT 1 NOT NULL,
  "capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "catalog_revision" integer DEFAULT 0 NOT NULL,
  "last_heartbeat_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "local_machines_protocol_check" CHECK ("protocol_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "local_pairings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid,
  "machine_id" uuid,
  "public_code_hash" text NOT NULL,
  "polling_secret_hash" text NOT NULL,
  "exchange_request_key" uuid,
  "safe_label" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "confirmed_at" timestamp with time zone,
  "consumed_at" timestamp with time zone,
  "request_key" uuid,
  "pending_credential_ciphertext" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "local_pairings_public_code_hash_unique" UNIQUE("public_code_hash"),
  CONSTRAINT "local_pairings_exchange_request_key_unique" UNIQUE("exchange_request_key")
);
--> statement-breakpoint
CREATE TABLE "local_project_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "machine_id" uuid NOT NULL,
  "checkout_handle" text NOT NULL,
  "checkout_key" text NOT NULL,
  "repository_id" text NOT NULL,
  "repository_node_id" text NOT NULL,
  "safe_label" text NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "readiness" text DEFAULT 'unknown' NOT NULL,
  "ready_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "local_project_links_revision_check" CHECK ("revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "local_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "machine_id" uuid NOT NULL,
  "link_id" uuid NOT NULL,
  "run_id" uuid,
  "preparation_id" uuid,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "payload_hash" text NOT NULL,
  "fence" integer NOT NULL,
  "sequence" integer DEFAULT 0 NOT NULL,
  "state" text DEFAULT 'queued' NOT NULL,
  "lease_expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "local_commands_operation_check" CHECK (("run_id" IS NULL) <> ("preparation_id" IS NULL)),
  CONSTRAINT "local_commands_kind_check" CHECK ("kind" IN ('prepare','start','inspect','cancel','answer'))
);
--> statement-breakpoint
CREATE TABLE "local_command_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "command_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "kind" text NOT NULL,
  "payload_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_run_gates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL,
  "gate_id" text NOT NULL,
  "attempt" integer NOT NULL,
  "manifest_hash" text NOT NULL,
  "required" boolean NOT NULL,
  "state" text NOT NULL,
  "reason" text,
  "command_digest" text NOT NULL,
  "checkout_digest" text NOT NULL,
  "exit_code" integer,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "execution_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_run_gates_state_check" CHECK ("state" IN ('passed','failed','blocked','unrun','unknown'))
);
--> statement-breakpoint
CREATE TABLE "task_run_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "relative_label" text NOT NULL,
  "visibility" text NOT NULL,
  "content_hash" text NOT NULL,
  "byte_size" integer NOT NULL,
  "safe_payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_run_evidence_size_check" CHECK ("byte_size" BETWEEN 0 AND 262144)
);
--> statement-breakpoint
ALTER TABLE "local_machines" ADD CONSTRAINT "local_machines_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "local_pairings" ADD CONSTRAINT "local_pairings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "local_pairings" ADD CONSTRAINT "local_pairings_machine_id_local_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "local_machines"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "local_project_links" ADD CONSTRAINT "local_project_links_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "local_project_links" ADD CONSTRAINT "local_project_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "local_project_links" ADD CONSTRAINT "local_project_links_machine_id_local_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "local_machines"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_machine_id_local_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "local_machines"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_link_id_local_project_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "local_project_links"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_run_id_task_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "task_execution_runs"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "local_command_events" ADD CONSTRAINT "local_command_events_command_id_local_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "local_commands"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "task_run_gates" ADD CONSTRAINT "task_run_gates_run_id_task_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "task_execution_runs"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "task_run_evidence" ADD CONSTRAINT "task_run_evidence_run_id_task_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "task_execution_runs"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "software_connections" ADD COLUMN "execution_target" text DEFAULT 'host' NOT NULL;
--> statement-breakpoint
ALTER TABLE "software_connections" ADD COLUMN "machine_id" uuid;
--> statement-breakpoint
ALTER TABLE "software_connections" ADD COLUMN "owner_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "software_connections" ADD CONSTRAINT "software_connections_target_check" CHECK (("execution_target" = 'host' AND "machine_id" IS NULL AND "owner_user_id" IS NULL) OR ("execution_target" = 'machine' AND "machine_id" IS NOT NULL AND "owner_user_id" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "software_connections" ADD CONSTRAINT "software_connections_machine_id_local_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "local_machines"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "software_connections" ADD CONSTRAINT "software_connections_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX "local_commands_run_start_unique" ON "local_commands" USING btree ("run_id") WHERE "kind" = 'start';
--> statement-breakpoint
CREATE INDEX "local_commands_poll_idx" ON "local_commands" USING btree ("machine_id","state","created_at");
--> statement-breakpoint
CREATE INDEX "local_machines_owner_idx" ON "local_machines" USING btree ("owner_user_id","created_at");
--> statement-breakpoint
CREATE INDEX "local_pairings_expiry_idx" ON "local_pairings" USING btree ("expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "local_pairings_request_key_unique" ON "local_pairings" USING btree ("owner_user_id","request_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "local_project_links_current_unique" ON "local_project_links" USING btree ("owner_user_id","project_id") WHERE "revoked_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "local_project_links_machine_idx" ON "local_project_links" USING btree ("machine_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "local_command_events_sequence_unique" ON "local_command_events" USING btree ("command_id","sequence");
--> statement-breakpoint
CREATE INDEX "task_run_gates_run_idx" ON "task_run_gates" USING btree ("run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "task_run_gates_attempt_unique" ON "task_run_gates" USING btree ("run_id","gate_id","attempt");
--> statement-breakpoint
CREATE INDEX "task_run_evidence_run_idx" ON "task_run_evidence" USING btree ("run_id","created_at");
