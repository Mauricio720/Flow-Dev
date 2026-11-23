ALTER TABLE "task_terminal_sessions" ADD COLUMN "status" text DEFAULT 'opening' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "claude_session_id" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "end_reason" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "active_skill" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "dropped_events" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "last_capture_at" timestamp with time zone;--> statement-breakpoint
UPDATE "task_terminal_sessions" SET "status" = 'launch_failed' WHERE "launch_failed_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_status_check" CHECK ("task_terminal_sessions"."status" IN ('opening','running','waiting','unconfirmed','ended','launch_failed'));--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_token_hash_unique" UNIQUE("token_hash");--> statement-breakpoint
CREATE TABLE "task_terminal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"path" text,
	"skill" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_terminal_events_kind_check" CHECK ("task_terminal_events"."kind" IN ('started','prompt','skill','file_edit','command','waiting','attention','ended')),
	CONSTRAINT "task_terminal_events_summary_check" CHECK (char_length("task_terminal_events"."summary") <= 500)
);
--> statement-breakpoint
ALTER TABLE "task_terminal_events" ADD CONSTRAINT "task_terminal_events_session_id_task_terminal_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_terminal_events_session_occurred_idx" ON "task_terminal_events" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "task_terminal_events_session_kind_occurred_idx" ON "task_terminal_events" USING btree ("session_id","kind","occurred_at");--> statement-breakpoint
CREATE TABLE "task_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"relative_path" text NOT NULL,
	"latest_version" integer DEFAULT 0 NOT NULL,
	"last_failure" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_artifacts" ADD CONSTRAINT "task_artifacts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_artifacts" ADD CONSTRAINT "task_artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_artifacts_task_path_unique" ON "task_artifacts" USING btree ("task_id","relative_path");--> statement-breakpoint
CREATE TABLE "task_artifact_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"skill" text NOT NULL,
	"session_id" uuid,
	"content" text NOT NULL,
	"sha256" text NOT NULL,
	"byte_size" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trigger" text NOT NULL,
	CONSTRAINT "task_artifact_versions_version_check" CHECK ("task_artifact_versions"."version" >= 1),
	CONSTRAINT "task_artifact_versions_size_check" CHECK ("task_artifact_versions"."byte_size" BETWEEN 0 AND 1048576),
	CONSTRAINT "task_artifact_versions_trigger_check" CHECK ("task_artifact_versions"."trigger" IN ('stop','session_end'))
);
--> statement-breakpoint
ALTER TABLE "task_artifact_versions" ADD CONSTRAINT "task_artifact_versions_artifact_id_task_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."task_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_artifact_versions" ADD CONSTRAINT "task_artifact_versions_session_id_task_terminal_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_artifact_versions_artifact_version_unique" ON "task_artifact_versions" USING btree ("artifact_id","version");
