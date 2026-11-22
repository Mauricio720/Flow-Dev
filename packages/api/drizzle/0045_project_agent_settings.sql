CREATE TABLE "project_agent_settings" (
	"project_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"effort" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_agent_settings_project_id_agent_pk" PRIMARY KEY("project_id","agent"),
	CONSTRAINT "project_agent_settings_agent_check" CHECK ("project_agent_settings"."agent" in ('issue_author','planning')),
	CONSTRAINT "project_agent_settings_provider_check" CHECK ("project_agent_settings"."provider" in ('claude','codex')),
	CONSTRAINT "project_agent_settings_effort_check" CHECK ("project_agent_settings"."effort" in ('low','medium','high')),
	CONSTRAINT "project_agent_settings_model_check" CHECK (char_length("project_agent_settings"."model") BETWEEN 1 AND 64),
	CONSTRAINT "project_agent_settings_version_check" CHECK ("project_agent_settings"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "project_agent_settings" ADD CONSTRAINT "project_agent_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent_settings" ADD CONSTRAINT "project_agent_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
