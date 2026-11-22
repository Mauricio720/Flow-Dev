CREATE TABLE "project_local_checkouts" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"path" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_local_checkouts_user_id_project_id_pk" PRIMARY KEY("user_id","project_id"),
	CONSTRAINT "project_local_checkouts_path_check" CHECK (char_length("project_local_checkouts"."path") BETWEEN 1 AND 1024),
	CONSTRAINT "project_local_checkouts_version_check" CHECK ("project_local_checkouts"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "project_local_checkouts" ADD CONSTRAINT "project_local_checkouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_local_checkouts" ADD CONSTRAINT "project_local_checkouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "task_terminal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"planning_decision_id" uuid NOT NULL,
	"route" text NOT NULL,
	"request_key" uuid NOT NULL,
	"checkout_path" text NOT NULL,
	"branch" text,
	"dirty" boolean NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signal_at" timestamp with time zone DEFAULT now() NOT NULL,
	"files_removed_at" timestamp with time zone,
	"launch_failed_at" timestamp with time zone,
	"launch_error" text,
	CONSTRAINT "task_terminal_sessions_route_check" CHECK ("task_terminal_sessions"."route" IN ('direct_execution','tech_spec','prd'))
);
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_planning_decision_id_task_planning_decisions_id_fk" FOREIGN KEY ("planning_decision_id") REFERENCES "public"."task_planning_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_terminal_sessions_request_key_unique" ON "task_terminal_sessions" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE INDEX "task_terminal_sessions_task_opened_idx" ON "task_terminal_sessions" USING btree ("task_id","opened_at" DESC);--> statement-breakpoint
CREATE TABLE "task_terminal_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"origin" text NOT NULL,
	"task_image_id" uuid,
	"original_name" text NOT NULL,
	"stored_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_terminal_attachments_origin_check" CHECK ("task_terminal_attachments"."origin" IN ('upload','issue_image')),
	CONSTRAINT "task_terminal_attachments_name_check" CHECK (char_length("task_terminal_attachments"."original_name") BETWEEN 1 AND 255),
	CONSTRAINT "task_terminal_attachments_size_check" CHECK ("task_terminal_attachments"."byte_size" BETWEEN 1 AND 10485760)
);
--> statement-breakpoint
ALTER TABLE "task_terminal_attachments" ADD CONSTRAINT "task_terminal_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_attachments" ADD CONSTRAINT "task_terminal_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_attachments" ADD CONSTRAINT "task_terminal_attachments_session_id_task_terminal_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_attachments" ADD CONSTRAINT "task_terminal_attachments_task_image_id_task_images_id_fk" FOREIGN KEY ("task_image_id") REFERENCES "public"."task_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_terminal_attachments_staged_sha_unique" ON "task_terminal_attachments" USING btree ("user_id","task_id","sha256") WHERE "task_terminal_attachments"."session_id" IS NULL;--> statement-breakpoint
CREATE INDEX "task_terminal_attachments_session_idx" ON "task_terminal_attachments" USING btree ("session_id");
