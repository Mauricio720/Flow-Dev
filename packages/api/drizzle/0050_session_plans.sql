CREATE TABLE "task_session_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"tasks_folder" text NOT NULL,
	"manifest_version" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_session_plans_task_id_unique" UNIQUE("task_id"),
	CONSTRAINT "task_session_plans_version_check" CHECK ("task_session_plans"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "task_session_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"task_ids" text[] NOT NULL,
	"agent" text NOT NULL,
	"model" text NOT NULL,
	"effort" text NOT NULL,
	"forced_by" uuid,
	"forced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_session_plan_items_position_check" CHECK ("task_session_plan_items"."position" >= 1),
	CONSTRAINT "task_session_plan_items_agent_check" CHECK ("task_session_plan_items"."agent" IN ('claude','codex')),
	CONSTRAINT "task_session_plan_items_task_ids_check" CHECK (cardinality("task_session_plan_items"."task_ids") BETWEEN 1 AND 30 AND array_to_string("task_session_plan_items"."task_ids", ',', '#') ~ '^task_[0-9]{2}(,task_[0-9]{2})*$'),
	CONSTRAINT "task_session_plan_items_model_check" CHECK (char_length("task_session_plan_items"."model") BETWEEN 1 AND 64),
	CONSTRAINT "task_session_plan_items_effort_check" CHECK (char_length("task_session_plan_items"."effort") BETWEEN 1 AND 64)
);
--> statement-breakpoint
ALTER TABLE "task_session_plans" ADD CONSTRAINT "task_session_plans_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plans" ADD CONSTRAINT "task_session_plans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_items" ADD CONSTRAINT "task_session_plan_items_plan_id_task_session_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."task_session_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_session_plan_items" ADD CONSTRAINT "task_session_plan_items_forced_by_users_id_fk" FOREIGN KEY ("forced_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_session_plan_items_plan_position_unique" ON "task_session_plan_items" USING btree ("plan_id","position");--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "purpose" text DEFAULT 'route' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "plan_item_id" uuid;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "agent" text DEFAULT 'claude' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "effort" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_purpose_check" CHECK ("task_terminal_sessions"."purpose" IN ('route','generate_tasks','plan_item'));--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_agent_check" CHECK ("task_terminal_sessions"."agent" IN ('claude','codex'));--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_plan_item_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."task_session_plan_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_terminal_sessions_plan_item_idx" ON "task_terminal_sessions" USING btree ("plan_item_id","opened_at") WHERE "task_terminal_sessions"."plan_item_id" IS NOT NULL;
