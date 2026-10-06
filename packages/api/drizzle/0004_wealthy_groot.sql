CREATE TABLE "task_capture_leases" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"capture_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid,
	"expected_version" integer,
	"token_hash" text NOT NULL,
	"state" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_capture_leases_capture_id_unique" UNIQUE("capture_id"),
	CONSTRAINT "task_capture_leases_state_check" CHECK ("task_capture_leases"."state" in ('capturing','processing'))
);
--> statement-breakpoint
CREATE TABLE "task_command_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"request_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"task_id" uuid NOT NULL,
	"operation_id" uuid,
	"revision_id" uuid,
	"accepted_result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_command_receipts_scope_unique" UNIQUE("project_id","actor_user_id","action","request_key")
);
--> statement-breakpoint
CREATE TABLE "task_context_capabilities" (
	"execution_id" uuid PRIMARY KEY NOT NULL,
	"operation_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"fence" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_draft_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"parent_revision_id" uuid,
	"operation_id" uuid,
	"canonical_draft" jsonb NOT NULL,
	"evidence_bindings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"manually_edited_paths" text[] DEFAULT '{}' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_draft_revisions_task_number_unique" UNIQUE("task_id","revision_number"),
	CONSTRAINT "task_draft_revisions_number_check" CHECK ("task_draft_revisions"."revision_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "task_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"tool_call_id" text NOT NULL,
	"repository_id" text NOT NULL,
	"repository_node_id" text NOT NULL,
	"type" text NOT NULL,
	"path" text,
	"commit_sha" text,
	"from_line" integer,
	"to_line" integer,
	"issue_id" text,
	"issue_number" integer,
	"url" text,
	"source_hash" text NOT NULL,
	"excerpt" text NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"operation_id" uuid,
	"sequence" integer NOT NULL,
	"role" text NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_messages_task_sequence_unique" UNIQUE("task_id","sequence"),
	CONSTRAINT "task_messages_user_operation_unique" UNIQUE("task_id","operation_id"),
	CONSTRAINT "task_messages_role_check" CHECK ("task_messages"."role" in ('user','assistant')),
	CONSTRAINT "task_messages_kind_check" CHECK ("task_messages"."kind" in ('intent','clarification','refinement','result')),
	CONSTRAINT "task_messages_sequence_check" CHECK ("task_messages"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "task_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"initiated_session_id" text NOT NULL,
	"base_task_version" integer NOT NULL,
	"base_revision_id" uuid,
	"execution_id" uuid,
	"lease_owner" text,
	"lease_until" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"fence" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"result" jsonb,
	"proposal_resolution" text,
	"dispatch_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_operations_kind_check" CHECK ("task_operations"."kind" in ('generate','publish')),
	CONSTRAINT "task_operations_state_check" CHECK ("task_operations"."state" in ('queued','running','succeeded','failed','uncertain')),
	CONSTRAINT "task_operations_fence_check" CHECK ("task_operations"."fence" >= 0),
	CONSTRAINT "task_operations_attempts_check" CHECK ("task_operations"."attempts" >= 0),
	CONSTRAINT "task_operations_proposal_resolution_check" CHECK ("task_operations"."proposal_resolution" is null or "task_operations"."proposal_resolution" in ('pending','applied','discarded'))
);
--> statement-breakpoint
CREATE TABLE "task_publication_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"publisher_user_id" uuid NOT NULL,
	"publisher_github_id" text NOT NULL,
	"repository_id" text NOT NULL,
	"repository_node_id" text NOT NULL,
	"approved_owner" text NOT NULL,
	"approved_name" text NOT NULL,
	"preview_hash" text NOT NULL,
	"title_snapshot" text NOT NULL,
	"body_snapshot" text NOT NULL,
	"approval_session_id" text NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatch_started_at" timestamp with time zone,
	"outcome" text DEFAULT 'queued' NOT NULL,
	"rejection_reason" text,
	"request_id" text,
	"verified_receipt" jsonb,
	"issue_id" text,
	"issue_node_id" text,
	"issue_number" integer,
	"issue_url" text,
	"issue_created_at" timestamp with time zone,
	CONSTRAINT "task_publication_attempts_outcome_check" CHECK ("task_publication_attempts"."outcome" in ('queued','dispatching','created','rejected','uncertain'))
);
--> statement-breakpoint
CREATE TABLE "task_repository_snapshots" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"repository_owner" text NOT NULL,
	"repository_name" text NOT NULL,
	"visibility" text NOT NULL,
	"archived" boolean NOT NULL,
	"verified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_tool_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"tool_call_id" text NOT NULL,
	"tool" text NOT NULL,
	"target" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"duration_ms" integer NOT NULL,
	"evidence_ids" text[] DEFAULT '{}' NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_tool_activity_execution_call_unique" UNIQUE("execution_id","tool_call_id"),
	CONSTRAINT "task_tool_activity_status_check" CHECK ("task_tool_activity"."status" in ('done','empty','unavailable')),
	CONSTRAINT "task_tool_activity_duration_check" CHECK ("task_tool_activity"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"repository_id" text NOT NULL,
	"repository_node_id" text NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"current_revision_id" uuid,
	"active_operation_id" uuid,
	"pending_proposal_operation_id" uuid,
	"title" text DEFAULT '' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('generating','awaiting_clarification','draft_ready','generation_failed','publishing','publication_uncertain','published')),
	CONSTRAINT "tasks_version_check" CHECK ("tasks"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "github_repository_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "github_node_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "repository_owner" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "repository_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "repository_visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "repository_verified_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task_capture_leases" ADD CONSTRAINT "task_capture_leases_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_context_capabilities" ADD CONSTRAINT "task_context_capabilities_operation_id_task_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."task_operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_draft_revisions" ADD CONSTRAINT "task_draft_revisions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_draft_revisions" ADD CONSTRAINT "task_draft_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evidence" ADD CONSTRAINT "task_evidence_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evidence" ADD CONSTRAINT "task_evidence_operation_id_task_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."task_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_base_revision_id_task_draft_revisions_id_fk" FOREIGN KEY ("base_revision_id") REFERENCES "public"."task_draft_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_publication_attempts" ADD CONSTRAINT "task_publication_attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_publication_attempts" ADD CONSTRAINT "task_publication_attempts_operation_id_task_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."task_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_repository_snapshots" ADD CONSTRAINT "task_repository_snapshots_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tool_activity" ADD CONSTRAINT "task_tool_activity_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tool_activity" ADD CONSTRAINT "task_tool_activity_operation_id_task_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."task_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_draft_revisions_task_created_idx" ON "task_draft_revisions" USING btree ("task_id","created_at","id");--> statement-breakpoint
CREATE INDEX "task_evidence_task_operation_idx" ON "task_evidence" USING btree ("task_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_operations_one_active_per_task_idx" ON "task_operations" USING btree ("task_id") WHERE "task_operations"."state" in ('queued','running','uncertain');--> statement-breakpoint
CREATE INDEX "task_operations_queue_idx" ON "task_operations" USING btree ("state","next_run_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_publication_attempts_unresolved_task_idx" ON "task_publication_attempts" USING btree ("task_id") WHERE "task_publication_attempts"."outcome" in ('queued','dispatching','uncertain');--> statement-breakpoint
CREATE UNIQUE INDEX "task_publication_attempts_repository_issue_idx" ON "task_publication_attempts" USING btree ("repository_id","issue_id") WHERE "task_publication_attempts"."issue_id" is not null;--> statement-breakpoint
CREATE INDEX "tasks_project_created_id_idx" ON "tasks" USING btree ("project_id","created_at","id");--> statement-breakpoint
CREATE INDEX "tasks_project_title_idx" ON "tasks" USING btree ("project_id","title");--> statement-breakpoint
CREATE INDEX "tasks_project_author_idx" ON "tasks" USING btree ("project_id","author_user_id");
--> statement-breakpoint
CREATE FUNCTION "protect_task_binding"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
    OR NEW.repository_id IS DISTINCT FROM OLD.repository_id
    OR NEW.repository_node_id IS DISTINCT FROM OLD.repository_node_id THEN
    RAISE EXCEPTION 'task binding is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "tasks_binding_immutable" BEFORE UPDATE ON "tasks" FOR EACH ROW EXECUTE FUNCTION "protect_task_binding"();
--> statement-breakpoint
CREATE FUNCTION "protect_task_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'task history is append only' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_messages_append_only" BEFORE UPDATE OR DELETE ON "task_messages" FOR EACH ROW EXECUTE FUNCTION "protect_task_history"();
--> statement-breakpoint
CREATE TRIGGER "task_draft_revisions_append_only" BEFORE UPDATE OR DELETE ON "task_draft_revisions" FOR EACH ROW EXECUTE FUNCTION "protect_task_history"();
--> statement-breakpoint
CREATE TRIGGER "task_command_receipts_append_only" BEFORE UPDATE OR DELETE ON "task_command_receipts" FOR EACH ROW EXECUTE FUNCTION "protect_task_history"();
--> statement-breakpoint
CREATE TRIGGER "task_evidence_append_only" BEFORE UPDATE OR DELETE ON "task_evidence" FOR EACH ROW EXECUTE FUNCTION "protect_task_history"();
--> statement-breakpoint
CREATE TRIGGER "task_tool_activity_append_only" BEFORE UPDATE OR DELETE ON "task_tool_activity" FOR EACH ROW EXECUTE FUNCTION "protect_task_history"();
--> statement-breakpoint
CREATE FUNCTION "protect_publication_snapshot"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.task_id IS DISTINCT FROM OLD.task_id
    OR NEW.operation_id IS DISTINCT FROM OLD.operation_id
    OR NEW.revision_id IS DISTINCT FROM OLD.revision_id
    OR NEW.publisher_user_id IS DISTINCT FROM OLD.publisher_user_id
    OR NEW.publisher_github_id IS DISTINCT FROM OLD.publisher_github_id
    OR NEW.repository_id IS DISTINCT FROM OLD.repository_id
    OR NEW.repository_node_id IS DISTINCT FROM OLD.repository_node_id
    OR NEW.approved_owner IS DISTINCT FROM OLD.approved_owner
    OR NEW.approved_name IS DISTINCT FROM OLD.approved_name
    OR NEW.preview_hash IS DISTINCT FROM OLD.preview_hash
    OR NEW.title_snapshot IS DISTINCT FROM OLD.title_snapshot
    OR NEW.body_snapshot IS DISTINCT FROM OLD.body_snapshot
    OR NEW.approval_session_id IS DISTINCT FROM OLD.approval_session_id
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'publication snapshot is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_publication_snapshot_immutable" BEFORE UPDATE ON "task_publication_attempts" FOR EACH ROW EXECUTE FUNCTION "protect_publication_snapshot"();
