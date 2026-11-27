ALTER TABLE "task_session_plan_items" DROP CONSTRAINT "task_session_plan_items_task_ids_check";--> statement-breakpoint
ALTER TABLE "task_session_plan_items" ADD CONSTRAINT "task_session_plan_items_task_ids_check" CHECK (cardinality("task_session_plan_items"."task_ids") BETWEEN 0 AND 30 AND (cardinality("task_session_plan_items"."task_ids") = 0 OR array_to_string("task_session_plan_items"."task_ids", ',', '#') ~ '^task_[0-9]{2}(,task_[0-9]{2})*$'));--> statement-breakpoint
CREATE TABLE "task_session_plan_item_dependencies" (
	"item_id" uuid NOT NULL,
	"after_item_id" uuid NOT NULL,
	CONSTRAINT "task_session_plan_item_dependencies_pk" PRIMARY KEY("item_id","after_item_id"),
	CONSTRAINT "task_session_plan_item_dependencies_self_check" CHECK ("task_session_plan_item_dependencies"."item_id" <> "task_session_plan_item_dependencies"."after_item_id")
);
--> statement-breakpoint
ALTER TABLE "task_session_plan_item_dependencies" ADD CONSTRAINT "task_session_plan_item_dependencies_item_fk" FOREIGN KEY ("item_id") REFERENCES "public"."task_session_plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_item_dependencies" ADD CONSTRAINT "task_session_plan_item_dependencies_after_fk" FOREIGN KEY ("after_item_id") REFERENCES "public"."task_session_plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_session_plan_item_dependencies_after_idx" ON "task_session_plan_item_dependencies" USING btree ("after_item_id");--> statement-breakpoint
CREATE TABLE "task_session_plan_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"host_id" text NOT NULL,
	"started_by" uuid NOT NULL,
	"state" text DEFAULT 'running' NOT NULL,
	"pause_reason" text,
	"paused_by" uuid,
	"current_item_id" uuid,
	"current_session_id" uuid,
	"resume_count" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"request_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_session_plan_runs_plan_id_unique" UNIQUE("plan_id"),
	CONSTRAINT "task_session_plan_runs_state_check" CHECK ("task_session_plan_runs"."state" IN ('running','paused','completed')),
	CONSTRAINT "task_session_plan_runs_revision_check" CHECK ("task_session_plan_runs"."revision" >= 1),
	CONSTRAINT "task_session_plan_runs_resume_count_check" CHECK ("task_session_plan_runs"."resume_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "task_session_plan_runs" ADD CONSTRAINT "task_session_plan_runs_plan_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."task_session_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_runs" ADD CONSTRAINT "task_session_plan_runs_started_by_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_runs" ADD CONSTRAINT "task_session_plan_runs_paused_by_fk" FOREIGN KEY ("paused_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_runs" ADD CONSTRAINT "task_session_plan_runs_current_item_fk" FOREIGN KEY ("current_item_id") REFERENCES "public"."task_session_plan_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_runs" ADD CONSTRAINT "task_session_plan_runs_current_session_fk" FOREIGN KEY ("current_session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_session_plan_runs_host_state_idx" ON "task_session_plan_runs" USING btree ("host_id","state");
