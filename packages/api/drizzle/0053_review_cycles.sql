CREATE TABLE "task_review_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"host_id" text NOT NULL,
	"started_by" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"reviewer_agent" text NOT NULL,
	"reviewer_model" text NOT NULL,
	"reviewer_effort" text NOT NULL,
	"executor_agent" text NOT NULL,
	"executor_model" text NOT NULL,
	"executor_effort" text NOT NULL,
	"review_session_id" uuid,
	"execute_session_id" uuid,
	"tasks_folder" text NOT NULL,
	"partial" boolean NOT NULL,
	"state" text DEFAULT 'reviewing' NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"step_role" text DEFAULT 'review' NOT NULL,
	"step_started_at" timestamp with time zone,
	"pending_action" text,
	"pending_by" uuid,
	"pending_at" timestamp with time zone,
	"failure" text,
	"stop_reason" text,
	"ended_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "task_review_cycles_state_check" CHECK ("state" IN ('reviewing','executing','caveats','failed','approved','accepted','stopped')),
	CONSTRAINT "task_review_cycles_step_role_check" CHECK ("step_role" IN ('review','execute')),
	CONSTRAINT "task_review_cycles_reviewer_agent_check" CHECK ("reviewer_agent" IN ('claude','codex')),
	CONSTRAINT "task_review_cycles_reviewer_model_check" CHECK (char_length("reviewer_model") BETWEEN 1 AND 64),
	CONSTRAINT "task_review_cycles_reviewer_effort_check" CHECK (char_length("reviewer_effort") BETWEEN 1 AND 64),
	CONSTRAINT "task_review_cycles_executor_agent_check" CHECK ("executor_agent" IN ('claude','codex')),
	CONSTRAINT "task_review_cycles_executor_model_check" CHECK (char_length("executor_model") BETWEEN 1 AND 64),
	CONSTRAINT "task_review_cycles_executor_effort_check" CHECK (char_length("executor_effort") BETWEEN 1 AND 64),
	CONSTRAINT "task_review_cycles_round_check" CHECK ("round" >= 1),
	CONSTRAINT "task_review_cycles_attempt_check" CHECK ("attempt" >= 1),
	CONSTRAINT "task_review_cycles_revision_check" CHECK ("revision" >= 1),
	CONSTRAINT "task_review_cycles_pending_action_check" CHECK ("pending_action" IS NULL OR "pending_action" IN ('stop','retry','accept','fix')),
	CONSTRAINT "task_review_cycles_started_by_request_key_unique" UNIQUE ("started_by","request_key"),
	CONSTRAINT "task_review_cycles_task_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "task_review_cycles_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_review_cycles_started_by_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_review_cycles_review_session_fk" FOREIGN KEY ("review_session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
	CONSTRAINT "task_review_cycles_execute_session_fk" FOREIGN KEY ("execute_session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
	CONSTRAINT "task_review_cycles_pending_by_fk" FOREIGN KEY ("pending_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
	CONSTRAINT "task_review_cycles_ended_by_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_review_cycles_task_active_unique" ON "task_review_cycles" USING btree ("task_id") WHERE "state" IN ('reviewing','executing','caveats','failed');
--> statement-breakpoint
CREATE INDEX "task_review_cycles_host_state_idx" ON "task_review_cycles" USING btree ("host_id","state");
--> statement-breakpoint
CREATE TABLE "task_review_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"review_session_id" uuid,
	"execute_session_id" uuid,
	"verdict" text,
	"report_path" text,
	"report_version_id" uuid,
	"reviewed_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	CONSTRAINT "task_review_rounds_number_check" CHECK ("number" >= 1),
	CONSTRAINT "task_review_rounds_verdict_check" CHECK ("verdict" IS NULL OR "verdict" IN ('approved','caveats','rejected')),
	CONSTRAINT "task_review_rounds_cycle_number_unique" UNIQUE ("cycle_id","number"),
	CONSTRAINT "task_review_rounds_cycle_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."task_review_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "task_review_rounds_review_session_fk" FOREIGN KEY ("review_session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
	CONSTRAINT "task_review_rounds_execute_session_fk" FOREIGN KEY ("execute_session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
	CONSTRAINT "task_review_rounds_report_version_fk" FOREIGN KEY ("report_version_id") REFERENCES "public"."task_artifact_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" DROP CONSTRAINT "task_terminal_sessions_purpose_check";
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_purpose_check" CHECK ("purpose" IN ('route','generate_tasks','plan_item','review','review_execute'));
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD COLUMN "review_cycle_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_review_cycle_fk" FOREIGN KEY ("review_cycle_id") REFERENCES "public"."task_review_cycles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
