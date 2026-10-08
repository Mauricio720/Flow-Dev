CREATE TABLE "task_execution_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "kind" text DEFAULT 'os_unified' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'planned' NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_execution_plans_task_unique" UNIQUE ("task_id"),
  CONSTRAINT "task_execution_plans_id_task_unique" UNIQUE ("id", "task_id"),
  CONSTRAINT "task_execution_plans_kind_check" CHECK ("kind" = 'os_unified'),
  CONSTRAINT "task_execution_plans_status_check" CHECK ("status" IN ('planned','running','completed','canceled')),
  CONSTRAINT "task_execution_plans_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "task_execution_plans_task_fk" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_execution_plans_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_execution_plan_saves" (
  "task_id" uuid NOT NULL,
  "idempotency_key" uuid NOT NULL,
  "request_hash" text NOT NULL,
  "result_revision" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_execution_plan_saves_pk" PRIMARY KEY ("task_id", "idempotency_key"),
  CONSTRAINT "task_execution_plan_saves_task_fk" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_execution_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "kind" text NOT NULL,
  "loop_name" text,
  "loop_version" text,
  "inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "workspace_kind" text DEFAULT 'isolated' NOT NULL,
  "worktree_id" text,
  "worktree_name" text,
  "state" text DEFAULT 'planned' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_execution_actions_position_unique" UNIQUE ("plan_id", "position"),
  CONSTRAINT "task_execution_actions_id_task_unique" UNIQUE ("id", "task_id"),
  CONSTRAINT "task_execution_actions_kind_check" CHECK ("kind" IN ('create_spec','create_tasks','loop')),
  CONSTRAINT "task_execution_actions_loop_check" CHECK (("kind" = 'loop') = ("loop_name" IS NOT NULL AND "loop_version" IS NOT NULL)),
  CONSTRAINT "task_execution_actions_workspace_check" CHECK ("workspace_kind" IN ('isolated','existing','new') AND (("workspace_kind" = 'existing') = ("worktree_id" IS NOT NULL)) AND (("workspace_kind" = 'new') = ("worktree_name" IS NOT NULL))),
  CONSTRAINT "task_execution_actions_state_check" CHECK ("state" IN ('planned','queued','running','succeeded','failed','canceled','blocked','reconciling')),
  CONSTRAINT "task_execution_actions_plan_fk" FOREIGN KEY ("plan_id", "task_id") REFERENCES "task_execution_plans" ("id", "task_id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "task_execution_actions_task_idx" ON "task_execution_actions" ("task_id", "position");
--> statement-breakpoint
CREATE TABLE "task_execution_runtime_bindings" (
  "action_id" uuid NOT NULL,
  "role" text NOT NULL,
  "connection_id" uuid NOT NULL,
  "provider_id" text NOT NULL,
  "model_id" text NOT NULL,
  "reasoning_effort" text,
  CONSTRAINT "task_execution_runtime_bindings_pk" PRIMARY KEY ("action_id", "role"),
  CONSTRAINT "task_execution_runtime_bindings_action_fk" FOREIGN KEY ("action_id") REFERENCES "task_execution_actions" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_execution_runtime_bindings_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "software_connections" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX "task_execution_bindings_connection_idx" ON "task_execution_runtime_bindings" ("connection_id");
--> statement-breakpoint
CREATE TABLE "task_execution_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "state" text DEFAULT 'queued' NOT NULL,
  "snapshot" jsonb NOT NULL,
  "worktree_id" text,
  "connection_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "is_write" boolean DEFAULT true NOT NULL,
  "lease_owner" text,
  "lease_fence" integer DEFAULT 0 NOT NULL,
  "lease_expires_at" timestamptz,
  "idempotency_key" uuid NOT NULL,
  "requested_by" uuid NOT NULL,
  "terminal_code" text,
  "runtime_workspace_id" text,
  "runtime_session_id" text,
  "runtime_turn_id" text,
  "runtime_run_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "finished_at" timestamptz,
  CONSTRAINT "task_execution_runs_attempt_unique" UNIQUE ("action_id", "attempt_number"),
  CONSTRAINT "task_execution_runs_key_unique" UNIQUE ("task_id", "idempotency_key"),
  CONSTRAINT "task_execution_runs_state_check" CHECK ("state" IN ('queued','dispatching','running','waiting','finalizing','stopping','reconciling','succeeded','failed','canceled','blocked','stalled','exhausted','unknown')),
  CONSTRAINT "task_execution_runs_action_fk" FOREIGN KEY ("action_id", "task_id") REFERENCES "task_execution_actions" ("id", "task_id") ON DELETE RESTRICT,
  CONSTRAINT "task_execution_runs_requested_by_fk" FOREIGN KEY ("requested_by") REFERENCES "users" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_execution_runs_active_write_idx" ON "task_execution_runs" ("task_id") WHERE "is_write" AND "state" IN ('queued','dispatching','running','waiting','finalizing','stopping','reconciling');
--> statement-breakpoint
CREATE INDEX "task_execution_runs_worktree_idx" ON "task_execution_runs" ("worktree_id");
--> statement-breakpoint
CREATE INDEX "task_execution_runs_connections_idx" ON "task_execution_runs" USING gin ("connection_ids");
--> statement-breakpoint
CREATE INDEX "task_execution_runs_task_idx" ON "task_execution_runs" ("task_id", "created_at");
--> statement-breakpoint
CREATE FUNCTION "task_execution_runs_immutable_snapshot"() RETURNS trigger AS $$
BEGIN
  IF NEW."snapshot" IS DISTINCT FROM OLD."snapshot" OR NEW."worktree_id" IS DISTINCT FROM OLD."worktree_id" OR NEW."connection_ids" IS DISTINCT FROM OLD."connection_ids" OR NEW."action_id" IS DISTINCT FROM OLD."action_id" OR NEW."idempotency_key" IS DISTINCT FROM OLD."idempotency_key" THEN
    RAISE EXCEPTION 'task execution run snapshot is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "task_execution_runs_snapshot_guard" BEFORE UPDATE ON "task_execution_runs" FOR EACH ROW EXECUTE FUNCTION "task_execution_runs_immutable_snapshot"();
--> statement-breakpoint
CREATE FUNCTION "task_execution_plan_requires_no_legacy"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "task_spec_workflows" WHERE "task_id" = NEW."task_id") THEN
    RAISE EXCEPTION 'task already follows the legacy spec flow' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "task_execution_plans_no_legacy" BEFORE INSERT ON "task_execution_plans" FOR EACH ROW EXECUTE FUNCTION "task_execution_plan_requires_no_legacy"();
--> statement-breakpoint
CREATE FUNCTION "task_spec_workflow_requires_no_unified"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "task_execution_plans" WHERE "task_id" = NEW."task_id") THEN
    RAISE EXCEPTION 'task already follows the unified flow' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "task_spec_workflows_no_unified" BEFORE INSERT ON "task_spec_workflows" FOR EACH ROW EXECUTE FUNCTION "task_spec_workflow_requires_no_unified"();
--> statement-breakpoint
CREATE VIEW "task_flow_kinds" AS
SELECT t."id" AS "task_id",
  CASE WHEN p."id" IS NOT NULL THEN 'unified' WHEN w."id" IS NOT NULL THEN 'legacy' ELSE 'none' END AS "flow_kind"
FROM "tasks" t
LEFT JOIN "task_execution_plans" p ON p."task_id" = t."id"
LEFT JOIN "task_spec_workflows" w ON w."task_id" = t."id";
