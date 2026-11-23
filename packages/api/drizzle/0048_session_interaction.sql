ALTER TABLE "task_terminal_sessions" ADD COLUMN "runtime" text DEFAULT 'terminal' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "permission_mode" text DEFAULT 'bypass' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "host_id" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "worker_id" text;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "interrupt_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "end_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_runtime_check" CHECK ("task_terminal_sessions"."runtime" IN ('terminal','flow_dev'));--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_permission_mode_check" CHECK ("task_terminal_sessions"."permission_mode" IN ('bypass','accept_edits','ask_all'));--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" DROP CONSTRAINT "task_terminal_sessions_status_check";--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_status_check" CHECK ("task_terminal_sessions"."status" IN ('opening','running','waiting','unconfirmed','ended','launch_failed','asking','interrupted'));--> statement-breakpoint
CREATE INDEX "task_terminal_sessions_host_status_idx" ON "task_terminal_sessions" USING btree ("host_id","status") WHERE "task_terminal_sessions"."runtime" = 'flow_dev';--> statement-breakpoint
CREATE TABLE "terminal_session_hosts" (
	"host_id" text PRIMARY KEY NOT NULL,
	"worker_id" text NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_terminal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"request_key" uuid,
	"delivered_at" timestamp with time zone,
	"undelivered" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_terminal_messages_role_check" CHECK ("task_terminal_messages"."role" IN ('user','assistant','system')),
	CONSTRAINT "task_terminal_messages_content_check" CHECK (char_length("task_terminal_messages"."content") <= 50000)
);
--> statement-breakpoint
ALTER TABLE "task_terminal_messages" ADD CONSTRAINT "task_terminal_messages_session_id_task_terminal_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_terminal_messages_session_request_key_unique" ON "task_terminal_messages" USING btree ("session_id","request_key");--> statement-breakpoint
CREATE INDEX "task_terminal_messages_session_occurred_idx" ON "task_terminal_messages" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "task_terminal_messages_queue_idx" ON "task_terminal_messages" USING btree ("session_id","occurred_at") WHERE "task_terminal_messages"."role" = 'user' AND "task_terminal_messages"."delivered_at" IS NULL AND "task_terminal_messages"."undelivered" = false;--> statement-breakpoint
CREATE TABLE "task_terminal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"tool_use_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"answer" jsonb,
	"answered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "task_terminal_requests_kind_check" CHECK ("task_terminal_requests"."kind" IN ('question','permission')),
	CONSTRAINT "task_terminal_requests_status_check" CHECK ("task_terminal_requests"."status" IN ('pending','answered','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "task_terminal_requests" ADD CONSTRAINT "task_terminal_requests_session_id_task_terminal_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_terminal_requests" ADD CONSTRAINT "task_terminal_requests_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_terminal_requests_session_status_idx" ON "task_terminal_requests" USING btree ("session_id","status");
