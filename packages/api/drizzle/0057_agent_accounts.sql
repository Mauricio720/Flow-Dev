CREATE TABLE "agent_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"host_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'pending_login' NOT NULL,
	"identity" text,
	"plan" text,
	"codex_catalog" jsonb,
	"checked_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_accounts_provider_check" CHECK ("provider" IN ('claude','codex')),
	CONSTRAINT "agent_accounts_label_check" CHECK (char_length(btrim("label")) BETWEEN 1 AND 40),
	CONSTRAINT "agent_accounts_status_check" CHECK ("status" IN ('pending_login','logged_in','logged_out','check_failed')),
	CONSTRAINT "agent_accounts_version_check" CHECK ("version" >= 1),
	CONSTRAINT "agent_accounts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_accounts_active_label_unique" ON "agent_accounts" USING btree ("owner_user_id","host_id","provider",lower("label")) WHERE "removed_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "agent_accounts_owner_host_idx" ON "agent_accounts" USING btree ("owner_user_id","host_id") WHERE "removed_at" IS NULL;
--> statement-breakpoint
CREATE TABLE "task_agent_accounts" (
	"task_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"account_id" uuid NOT NULL,
	"chosen_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_agent_accounts_pkey" PRIMARY KEY("task_id","provider"),
	CONSTRAINT "task_agent_accounts_provider_check" CHECK ("provider" IN ('claude','codex')),
	CONSTRAINT "task_agent_accounts_version_check" CHECK ("version" >= 1),
	CONSTRAINT "task_agent_accounts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "task_agent_accounts_account_id_agent_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."agent_accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_agent_accounts_chosen_by_users_id_fk" FOREIGN KEY ("chosen_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "agent_account_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_agent_account_id_agent_accounts_id_fk" FOREIGN KEY ("agent_account_id") REFERENCES "public"."agent_accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
