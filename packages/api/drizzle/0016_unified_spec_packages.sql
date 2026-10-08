CREATE TABLE "task_unified_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "source_run_id" uuid NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "format" text DEFAULT 'os_spec_v1' NOT NULL,
  "version" integer NOT NULL,
  "status" text DEFAULT 'review_ready' NOT NULL,
  "manifest" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_unified_packages_version_unique" UNIQUE ("task_id", "version"),
  CONSTRAINT "task_unified_packages_format_check" CHECK ("format" IN ('os_spec_v1','os_tasks_v1')),
  CONSTRAINT "task_unified_packages_status_check" CHECK ("status" IN ('review_ready','approved','superseded')),
  CONSTRAINT "task_unified_packages_task_fk" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_unified_packages_run_fk" FOREIGN KEY ("source_run_id") REFERENCES "task_execution_runs" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX "task_unified_packages_task_idx" ON "task_unified_packages" ("task_id", "version");
--> statement-breakpoint
CREATE TABLE "task_unified_package_files" (
  "package_id" uuid NOT NULL,
  "path" text NOT NULL,
  "role" text NOT NULL,
  "source_text" text NOT NULL,
  "byte_count" integer NOT NULL,
  "sha256" text NOT NULL,
  "required" boolean NOT NULL,
  CONSTRAINT "task_unified_package_files_path_unique" UNIQUE ("package_id", "path"),
  CONSTRAINT "task_unified_package_files_package_fk" FOREIGN KEY ("package_id") REFERENCES "task_unified_packages" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE "task_unified_package_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "approver_user_id" uuid NOT NULL,
  "idempotency_key" uuid NOT NULL,
  "approved_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_unified_package_approvals_package_unique" UNIQUE ("package_id"),
  CONSTRAINT "task_unified_package_approvals_key_unique" UNIQUE ("task_id", "idempotency_key"),
  CONSTRAINT "task_unified_package_approvals_package_fk" FOREIGN KEY ("package_id") REFERENCES "task_unified_packages" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_unified_package_approvals_task_fk" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE RESTRICT,
  CONSTRAINT "task_unified_package_approvals_approver_fk" FOREIGN KEY ("approver_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE FUNCTION "task_unified_package_content_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'unified package content is immutable' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "task_unified_package_files_immutable" BEFORE UPDATE OR DELETE ON "task_unified_package_files" FOR EACH ROW EXECUTE FUNCTION "task_unified_package_content_immutable"();
--> statement-breakpoint
CREATE TRIGGER "task_unified_package_approvals_immutable" BEFORE UPDATE OR DELETE ON "task_unified_package_approvals" FOR EACH ROW EXECUTE FUNCTION "task_unified_package_content_immutable"();
--> statement-breakpoint
CREATE FUNCTION "task_unified_package_frozen_fields"() RETURNS trigger AS $$
BEGIN
  IF NEW."manifest" IS DISTINCT FROM OLD."manifest" OR NEW."version" IS DISTINCT FROM OLD."version" OR NEW."snapshot_id" IS DISTINCT FROM OLD."snapshot_id" OR NEW."source_run_id" IS DISTINCT FROM OLD."source_run_id" OR NEW."task_id" IS DISTINCT FROM OLD."task_id" THEN
    RAISE EXCEPTION 'unified package identity is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "task_unified_packages_frozen" BEFORE UPDATE ON "task_unified_packages" FOR EACH ROW EXECUTE FUNCTION "task_unified_package_frozen_fields"();
