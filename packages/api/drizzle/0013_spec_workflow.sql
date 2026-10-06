ALTER TABLE "tasks" ADD CONSTRAINT "tasks_id_project_unique" UNIQUE ("id", "project_id");
--> statement-breakpoint
CREATE TABLE "task_spec_workflows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "author_user_id" uuid NOT NULL,
  "publication_id" uuid NOT NULL,
  "planning_decision_id" uuid NOT NULL,
  "selected_route" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "current_stage" text NOT NULL,
  "state" text DEFAULT 'queued' NOT NULL,
  "workspace_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_spec_workflows_task_unique" UNIQUE ("task_id"),
  CONSTRAINT "task_spec_workflows_id_task_unique" UNIQUE ("id", "task_id"),
  CONSTRAINT "task_spec_workflows_route_check" CHECK ("selected_route" IN ('prd','tech_spec')),
  CONSTRAINT "task_spec_workflows_version_check" CHECK ("version" > 0),
  CONSTRAINT "task_spec_workflows_stage_check" CHECK ("current_stage" IN ('prd','tech_spec','tasks') AND ("selected_route" = 'prd' OR "current_stage" <> 'prd')),
  CONSTRAINT "task_spec_workflows_state_check" CHECK ("state" IN ('not_started','queued','running','waiting_question','waiting_permission','finalizing','review','stopping','failed','canceled','approved')),
  CONSTRAINT "task_spec_workflows_task_fk" FOREIGN KEY ("task_id", "project_id") REFERENCES "tasks" ("id", "project_id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_workflows_publication_fk" FOREIGN KEY ("task_id", "publication_id") REFERENCES "task_publication_attempts" ("task_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_workflows_decision_fk" FOREIGN KEY ("planning_decision_id") REFERENCES "task_planning_decisions" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_workflows_author_fk" FOREIGN KEY ("author_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_spec_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "repository_github_id" text NOT NULL,
  "repository_node_id" text NOT NULL,
  "base_commit" text NOT NULL,
  "runner_id" text NOT NULL,
  "checkout_locator" text NOT NULL,
  "slug" text NOT NULL,
  "installed_manifest_hash" text,
  "state" text DEFAULT 'ready' NOT NULL,
  "capacity" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_spec_workspaces_workflow_unique" UNIQUE ("workflow_id"),
  CONSTRAINT "task_spec_workspaces_slug_unique" UNIQUE ("slug"),
  CONSTRAINT "task_spec_workspaces_slug_check" CHECK ("slug" ~ '^flow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT "task_spec_workspaces_commit_check" CHECK ("base_commit" ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'),
  CONSTRAINT "task_spec_workspaces_manifest_check" CHECK ("installed_manifest_hash" IS NULL OR "installed_manifest_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "task_spec_workspaces_state_check" CHECK ("state" IN ('ready','conflicted','unavailable')),
  CONSTRAINT "task_spec_workspaces_workflow_fk" FOREIGN KEY ("workflow_id") REFERENCES "task_spec_workflows" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
ALTER TABLE "task_spec_workflows" ADD CONSTRAINT "task_spec_workflows_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "task_spec_workspaces" ("id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE TABLE "task_spec_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "stage" text NOT NULL,
  "attempt_number" integer NOT NULL,
  "kind" text NOT NULL,
  "source_attempt_id" uuid,
  "input" jsonb NOT NULL,
  "input_hash" text NOT NULL,
  "state" text DEFAULT 'queued' NOT NULL,
  "runtime_workspace_id" text,
  "runtime_session_id" text,
  "runtime_turn_id" text,
  "prompt_message_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prompt_idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lease_owner" text,
  "lease_fence" integer DEFAULT 0 NOT NULL,
  "lease_expires_at" timestamptz,
  "runtime_cursor" text,
  "terminal_reason" text,
  "stop_requested_at" timestamptz,
  "attention" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "finished_at" timestamptz,
  CONSTRAINT "task_spec_attempts_number_unique" UNIQUE ("workflow_id", "attempt_number"),
  CONSTRAINT "task_spec_attempts_workflow_id_unique" UNIQUE ("workflow_id", "id"),
  CONSTRAINT "task_spec_attempts_prompt_message_unique" UNIQUE ("prompt_message_id"),
  CONSTRAINT "task_spec_attempts_prompt_key_unique" UNIQUE ("prompt_idempotency_key"),
  CONSTRAINT "task_spec_attempts_stage_check" CHECK ("stage" IN ('prd','tech_spec','tasks')),
  CONSTRAINT "task_spec_attempts_number_check" CHECK ("attempt_number" > 0 AND "lease_fence" >= 0),
  CONSTRAINT "task_spec_attempts_kind_check" CHECK ("kind" IN ('generate','adjust','retry') AND ("kind" = 'generate') = ("source_attempt_id" IS NULL)),
  CONSTRAINT "task_spec_attempts_state_check" CHECK ("state" IN ('queued','dispatching','running','waiting','finalizing','stopping','reconciling','completed','failed','canceled')),
  CONSTRAINT "task_spec_attempts_hash_check" CHECK ("input_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "task_spec_attempts_workflow_fk" FOREIGN KEY ("workflow_id") REFERENCES "task_spec_workflows" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_attempts_source_fk" FOREIGN KEY ("workflow_id", "source_attempt_id") REFERENCES "task_spec_attempts" ("workflow_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_spec_attempts_active_workflow_idx" ON "task_spec_attempts" ("workflow_id") WHERE "state" IN ('queued','dispatching','running','waiting','finalizing','stopping','reconciling');
--> statement-breakpoint
CREATE INDEX "task_spec_attempts_queue_idx" ON "task_spec_attempts" ("state", "created_at") WHERE "state" = 'queued';
--> statement-breakpoint
CREATE TABLE "task_spec_stages" (
  "workflow_id" uuid NOT NULL,
  "stage" text NOT NULL,
  "state" text DEFAULT 'not_started' NOT NULL,
  "current_attempt_id" uuid,
  "current_package_id" uuid,
  "previous_complete_package_id" uuid,
  "approved_package_id" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("workflow_id", "stage"),
  CONSTRAINT "task_spec_stages_stage_check" CHECK ("stage" IN ('prd','tech_spec','tasks')),
  CONSTRAINT "task_spec_stages_state_check" CHECK ("state" IN ('not_started','queued','running','waiting_question','waiting_permission','finalizing','review','stopping','failed','canceled','approved')),
  CONSTRAINT "task_spec_stages_version_check" CHECK ("version" > 0),
  CONSTRAINT "task_spec_stages_approved_check" CHECK (("state" = 'approved') = ("approved_package_id" IS NOT NULL)),
  CONSTRAINT "task_spec_stages_workflow_fk" FOREIGN KEY ("workflow_id") REFERENCES "task_spec_workflows" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_stages_attempt_fk" FOREIGN KEY ("workflow_id", "current_attempt_id") REFERENCES "task_spec_attempts" ("workflow_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_spec_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "workflow_id" uuid,
  "action" text NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "request_key" uuid NOT NULL,
  "payload_hash" text NOT NULL,
  "expected_version" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'accepted' NOT NULL,
  "spec_version" integer NOT NULL,
  "attempt_id" uuid,
  "package_id" uuid,
  "delivery_status" text DEFAULT 'pending' NOT NULL,
  "reason" text,
  "lease_owner" text,
  "lease_fence" integer DEFAULT 0 NOT NULL,
  "lease_expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_spec_commands_request_unique" UNIQUE ("actor_user_id", "request_key"),
  CONSTRAINT "task_spec_commands_action_check" CHECK ("action" IN ('spec.start','spec.adjust','spec.answer','spec.permission','spec.cancel','spec.retry','spec.returnToReview','spec.approve')),
  CONSTRAINT "task_spec_commands_status_check" CHECK ("status" IN ('accepted','applied','rejected','reconciling')),
  CONSTRAINT "task_spec_commands_delivery_check" CHECK ("delivery_status" IN ('pending','delivered','not_applicable','orphaned','unknown')),
  CONSTRAINT "task_spec_commands_version_check" CHECK ("expected_version" >= 0 AND "spec_version" > 0 AND "payload_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "task_spec_commands_task_fk" FOREIGN KEY ("task_id", "project_id") REFERENCES "tasks" ("id", "project_id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_commands_workflow_fk" FOREIGN KEY ("workflow_id", "task_id") REFERENCES "task_spec_workflows" ("id", "task_id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_commands_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_commands_attempt_fk" FOREIGN KEY ("attempt_id") REFERENCES "task_spec_attempts" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX "task_spec_commands_workflow_idx" ON "task_spec_commands" ("workflow_id", "created_at");
--> statement-breakpoint
CREATE TABLE "task_spec_interactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "attempt_id" uuid NOT NULL,
  "runtime_session_id" text NOT NULL,
  "runtime_turn_id" text NOT NULL,
  "runtime_interaction_id" text NOT NULL,
  "provider_request_id" text NOT NULL,
  "kind" text NOT NULL,
  "description" text NOT NULL,
  "choices" jsonb,
  "target" jsonb,
  "target_digest" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "winning_command_id" uuid,
  "response" jsonb,
  "delivery" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "resolved_at" timestamptz,
  CONSTRAINT "task_spec_interactions_runtime_unique" UNIQUE ("attempt_id", "runtime_interaction_id"),
  CONSTRAINT "task_spec_interactions_kind_check" CHECK ("kind" IN ('question','permission')),
  CONSTRAINT "task_spec_interactions_status_check" CHECK ("status" IN ('pending','resolved','superseded','blocked')),
  CONSTRAINT "task_spec_interactions_delivery_check" CHECK ("delivery" IN ('pending','delivered','orphaned','unknown','inactive')),
  CONSTRAINT "task_spec_interactions_content_check" CHECK ("status" = 'blocked' OR (length(btrim("description")) > 0 AND ("kind" = 'question' OR "target_digest" ~ '^[0-9a-f]{64}$'))),
  CONSTRAINT "task_spec_interactions_attempt_fk" FOREIGN KEY ("workflow_id", "attempt_id") REFERENCES "task_spec_attempts" ("workflow_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_interactions_command_fk" FOREIGN KEY ("winning_command_id") REFERENCES "task_spec_commands" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_spec_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "sequence" bigint NOT NULL,
  "attempt_id" uuid NOT NULL,
  "runtime_session_id" text,
  "runtime_generation" text,
  "runtime_sequence" bigint,
  "provider_event_id" text,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "observed_at" timestamptz DEFAULT now() NOT NULL,
  "emitted_at" timestamptz,
  CONSTRAINT "task_spec_events_sequence_unique" UNIQUE ("workflow_id", "sequence"),
  CONSTRAINT "task_spec_events_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "task_spec_events_attempt_fk" FOREIGN KEY ("workflow_id", "attempt_id") REFERENCES "task_spec_attempts" ("workflow_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_spec_events_provider_unique" ON "task_spec_events" ("attempt_id", "provider_event_id") WHERE "provider_event_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "task_spec_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "stage" text NOT NULL,
  "attempt_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "parent_package_id" uuid,
  "input_package_ids" uuid[] DEFAULT '{}' NOT NULL,
  "manifest_hash" text NOT NULL,
  "capture_state" text NOT NULL,
  "diagnostics" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "package_index" jsonb NOT NULL,
  "diff_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "readiness_version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "task_spec_packages_attempt_manifest_unique" UNIQUE ("attempt_id", "manifest_hash"),
  CONSTRAINT "task_spec_packages_revision_unique" UNIQUE ("workflow_id", "stage", "revision"),
  CONSTRAINT "task_spec_packages_identity_unique" UNIQUE ("workflow_id", "id"),
  CONSTRAINT "task_spec_packages_stage_check" CHECK ("stage" IN ('prd','tech_spec','tasks') AND "revision" > 0),
  CONSTRAINT "task_spec_packages_hash_check" CHECK ("manifest_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "task_spec_packages_state_check" CHECK ("capture_state" IN ('partial','prepared','installed','review_ready')),
  CONSTRAINT "task_spec_packages_attempt_fk" FOREIGN KEY ("workflow_id", "attempt_id") REFERENCES "task_spec_attempts" ("workflow_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_packages_parent_fk" FOREIGN KEY ("workflow_id", "parent_package_id") REFERENCES "task_spec_packages" ("workflow_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_spec_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_id" uuid NOT NULL,
  "path" text NOT NULL,
  "role" text NOT NULL,
  "source_text" text NOT NULL,
  "byte_count" integer NOT NULL,
  "sha256" text NOT NULL,
  "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_spec_documents_path_unique" UNIQUE ("package_id", "path"),
  CONSTRAINT "task_spec_documents_size_check" CHECK ("byte_count" = octet_length("source_text") AND "byte_count" <= 1048576),
  CONSTRAINT "task_spec_documents_hash_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "task_spec_documents_path_check" CHECK ("path" !~ '(^/|\.\.|\\)' AND length("path") BETWEEN 1 AND 512),
  CONSTRAINT "task_spec_documents_package_fk" FOREIGN KEY ("package_id") REFERENCES "task_spec_packages" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_spec_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "stage" text NOT NULL,
  "package_id" uuid NOT NULL,
  "manifest_hash" text NOT NULL,
  "approver_user_id" uuid NOT NULL,
  "approved_at" timestamptz DEFAULT now() NOT NULL,
  "installed_manifest_hash" text NOT NULL,
  CONSTRAINT "task_spec_approvals_stage_unique" UNIQUE ("workflow_id", "stage"),
  CONSTRAINT "task_spec_approvals_hash_check" CHECK ("manifest_hash" ~ '^[0-9a-f]{64}$' AND "installed_manifest_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "task_spec_approvals_package_fk" FOREIGN KEY ("workflow_id", "package_id") REFERENCES "task_spec_packages" ("workflow_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_approvals_approver_fk" FOREIGN KEY ("approver_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_spec_finalizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "command_id" uuid,
  "attempt_id" uuid NOT NULL,
  "source_manifest" jsonb NOT NULL,
  "target_manifest" jsonb NOT NULL,
  "file_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "phase" text DEFAULT 'prepared' NOT NULL,
  "failure_reason" text,
  "verified_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_spec_finalizations_phase_check" CHECK ("phase" IN ('prepared','installing','installed','verified','failed')),
  CONSTRAINT "task_spec_finalizations_verified_check" CHECK (("phase" = 'verified') = ("verified_at" IS NOT NULL)),
  CONSTRAINT "task_spec_finalizations_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "task_spec_workspaces" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_finalizations_command_fk" FOREIGN KEY ("command_id") REFERENCES "task_spec_commands" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_spec_finalizations_attempt_fk" FOREIGN KEY ("workflow_id", "attempt_id") REFERENCES "task_spec_attempts" ("workflow_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_spec_finalizations_pending_idx" ON "task_spec_finalizations" ("workspace_id") WHERE "phase" IN ('prepared','installing','installed');
--> statement-breakpoint
CREATE FUNCTION "guard_task_spec_workflow_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  task_row "tasks"%ROWTYPE;
  decision_row "task_planning_decisions"%ROWTYPE;
BEGIN
  SELECT * INTO task_row FROM "tasks" WHERE "id" = NEW.task_id FOR UPDATE;
  SELECT * INTO decision_row FROM "task_planning_decisions" WHERE "id" = NEW.planning_decision_id AND "task_id" = NEW.task_id;
  IF task_row.id IS NULL OR task_row.status <> 'published' OR task_row.author_user_id <> NEW.author_user_id THEN
    RAISE EXCEPTION 'spec workflow requires its published task and author';
  END IF;
  IF decision_row.id IS NULL OR decision_row.status <> 'approved' OR decision_row.selected_route <> NEW.selected_route THEN
    RAISE EXCEPTION 'spec workflow requires the approved selected planning route';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_spec_workflow_insert_guard" BEFORE INSERT ON "task_spec_workflows" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_workflow_insert"();
--> statement-breakpoint
CREATE FUNCTION "guard_task_spec_workflow_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'spec workflows cannot be deleted';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id OR NEW.publication_id IS DISTINCT FROM OLD.publication_id OR NEW.planning_decision_id IS DISTINCT FROM OLD.planning_decision_id OR NEW.selected_route IS DISTINCT FROM OLD.selected_route THEN
    RAISE EXCEPTION 'spec workflow identity is immutable';
  END IF;
  IF NEW.version < OLD.version THEN
    RAISE EXCEPTION 'spec version cannot decrease';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_spec_workflow_update_guard" BEFORE UPDATE OR DELETE ON "task_spec_workflows" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_workflow_update"();
--> statement-breakpoint
CREATE FUNCTION "guard_task_spec_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_spec_approvals_immutable" BEFORE UPDATE OR DELETE ON "task_spec_approvals" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_immutable"();
--> statement-breakpoint
CREATE TRIGGER "task_spec_documents_immutable" BEFORE UPDATE OR DELETE ON "task_spec_documents" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_immutable"();
--> statement-breakpoint
CREATE TRIGGER "task_spec_events_immutable" BEFORE UPDATE OR DELETE ON "task_spec_events" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_immutable"();
--> statement-breakpoint
CREATE FUNCTION "guard_task_spec_approval_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  package_row "task_spec_packages"%ROWTYPE;
BEGIN
  SELECT * INTO package_row FROM "task_spec_packages" WHERE "id" = NEW.package_id AND "workflow_id" = NEW.workflow_id;
  IF package_row.id IS NULL OR package_row.stage <> NEW.stage OR package_row.manifest_hash <> NEW.manifest_hash OR package_row.capture_state NOT IN ('installed','review_ready') THEN
    RAISE EXCEPTION 'approval requires the exact installed package';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_spec_approval_insert_guard" BEFORE INSERT ON "task_spec_approvals" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_approval_insert"();
--> statement-breakpoint
CREATE FUNCTION "guard_task_spec_package_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'spec packages cannot be deleted';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.workflow_id IS DISTINCT FROM OLD.workflow_id OR NEW.stage IS DISTINCT FROM OLD.stage OR NEW.attempt_id IS DISTINCT FROM OLD.attempt_id OR NEW.revision IS DISTINCT FROM OLD.revision OR NEW.parent_package_id IS DISTINCT FROM OLD.parent_package_id OR NEW.input_package_ids IS DISTINCT FROM OLD.input_package_ids OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash OR NEW.package_index IS DISTINCT FROM OLD.package_index OR NEW.diff_summary IS DISTINCT FROM OLD.diff_summary OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'captured package content is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_spec_package_update_guard" BEFORE UPDATE OR DELETE ON "task_spec_packages" FOR EACH ROW EXECUTE FUNCTION "guard_task_spec_package_update"();
