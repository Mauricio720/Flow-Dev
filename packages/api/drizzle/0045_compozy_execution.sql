CREATE TABLE "project_compozy_bindings" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"checkout_path" text NOT NULL,
	"compozy_workspace_id" text,
	"state" text NOT NULL,
	"failure_code" text,
	"default_branch" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_compozy_bindings_state_check" CHECK ("project_compozy_bindings"."state" in ('ready','invalid')),
	CONSTRAINT "project_compozy_bindings_revision_check" CHECK ("project_compozy_bindings"."revision" > 0),
	CONSTRAINT "project_compozy_bindings_path_check" CHECK (char_length("project_compozy_bindings"."checkout_path") between 1 and 4096),
	CONSTRAINT "project_compozy_bindings_failure_check" CHECK ("project_compozy_bindings"."failure_code" is null or "project_compozy_bindings"."failure_code" in ('checkout_not_found','checkout_not_git_root','checkout_remote_mismatch','default_branch_unknown')),
	CONSTRAINT "project_compozy_bindings_outcome_check" CHECK (("project_compozy_bindings"."state" = 'ready' and "project_compozy_bindings"."compozy_workspace_id" is not null and "project_compozy_bindings"."default_branch" is not null and "project_compozy_bindings"."failure_code" is null) or ("project_compozy_bindings"."state" = 'invalid' and "project_compozy_bindings"."compozy_workspace_id" is null and "project_compozy_bindings"."failure_code" is not null))
);
--> statement-breakpoint
CREATE TABLE "task_compozy_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"planning_decision_id" uuid NOT NULL,
	"route" text NOT NULL,
	"state" text NOT NULL,
	"attempt" integer NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"compozy_workspace_id" text NOT NULL,
	"spec_task_id" text,
	"spec_worktree_id" text,
	"spec_dir" text,
	"spec_round" integer DEFAULT 0 NOT NULL,
	"work_task_id" text,
	"branch" text NOT NULL,
	"pull_request_url" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" text,
	"last_synced_at" timestamp with time zone,
	"started_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "task_compozy_executions_route_check" CHECK ("task_compozy_executions"."route" in ('direct_execution','tech_spec','prd')),
	CONSTRAINT "task_compozy_executions_state_check" CHECK ("task_compozy_executions"."state" in ('dispatching','unavailable','spec_in_progress','spec_review','in_progress','needs_attention','completed','failed','canceled','rejected')),
	CONSTRAINT "task_compozy_executions_attempt_check" CHECK ("task_compozy_executions"."attempt" > 0),
	CONSTRAINT "task_compozy_executions_spec_round_check" CHECK ("task_compozy_executions"."spec_round" >= 0),
	CONSTRAINT "task_compozy_executions_detail_check" CHECK (jsonb_typeof("task_compozy_executions"."detail") = 'object')
);
--> statement-breakpoint
CREATE TABLE "task_compozy_spec_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"actor_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_compozy_spec_reviews_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "task_compozy_spec_reviews_decision_check" CHECK ("task_compozy_spec_reviews"."decision" in ('approve','request_changes','reject')),
	CONSTRAINT "task_compozy_spec_reviews_round_check" CHECK ("task_compozy_spec_reviews"."round" > 0),
	CONSTRAINT "task_compozy_spec_reviews_note_check" CHECK (("task_compozy_spec_reviews"."note" is null or char_length("task_compozy_spec_reviews"."note") between 1 and 4000) and ("task_compozy_spec_reviews"."decision" <> 'request_changes' or "task_compozy_spec_reviews"."note" is not null))
);
--> statement-breakpoint
ALTER TABLE "project_compozy_bindings" ADD CONSTRAINT "project_compozy_bindings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_compozy_bindings" ADD CONSTRAINT "project_compozy_bindings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_compozy_executions" ADD CONSTRAINT "task_compozy_executions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_compozy_executions" ADD CONSTRAINT "task_compozy_executions_planning_decision_id_task_planning_decisions_id_fk" FOREIGN KEY ("planning_decision_id") REFERENCES "public"."task_planning_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_compozy_executions" ADD CONSTRAINT "task_compozy_executions_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_compozy_spec_reviews" ADD CONSTRAINT "task_compozy_spec_reviews_execution_id_task_compozy_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."task_compozy_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_compozy_spec_reviews" ADD CONSTRAINT "task_compozy_spec_reviews_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_compozy_executions_request_unique" ON "task_compozy_executions" USING btree ("task_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "task_compozy_executions_attempt_unique" ON "task_compozy_executions" USING btree ("planning_decision_id","attempt");--> statement-breakpoint
CREATE UNIQUE INDEX "task_compozy_executions_active_unique" ON "task_compozy_executions" USING btree ("task_id") WHERE "task_compozy_executions"."state" in ('dispatching','unavailable','spec_in_progress','spec_review','in_progress','needs_attention');--> statement-breakpoint
CREATE INDEX "task_compozy_executions_sync_idx" ON "task_compozy_executions" USING btree ("state","last_synced_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_compozy_spec_reviews_round_unique" ON "task_compozy_spec_reviews" USING btree ("execution_id","round");
