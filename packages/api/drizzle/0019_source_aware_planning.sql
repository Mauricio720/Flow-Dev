ALTER TABLE "task_operations" ADD COLUMN "source_snapshot_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_operations" ADD COLUMN "requester_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_operations" ADD COLUMN "source_format_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_source_format_check" CHECK ("source_format_version" IN (1, 2));
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_source_snapshot_fk" FOREIGN KEY ("source_snapshot_id") REFERENCES "task_issue_snapshots" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_requester_fk" FOREIGN KEY ("requester_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_operations" DROP CONSTRAINT "task_operations_plan_association_check";
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_plan_association_check" CHECK (
  ("kind" = 'plan' AND "input_hash" ~ '^[0-9a-f]{64}$' AND (
    ("source_format_version" = 1 AND "publication_attempt_id" IS NOT NULL AND "source_snapshot_id" IS NULL)
    OR ("source_format_version" = 2 AND "source_snapshot_id" IS NOT NULL AND "publication_attempt_id" IS NULL AND "requester_user_id" IS NOT NULL)))
  OR ("kind" <> 'plan' AND "publication_attempt_id" IS NULL AND "input_hash" IS NULL AND "source_snapshot_id" IS NULL)
);
--> statement-breakpoint
UPDATE "task_operations" o SET "requester_user_id" = s."user_id" FROM "sessions" s WHERE o."kind" = 'plan' AND o."initiated_session_id" = s."id";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "guard_task_plan_operation"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  task_row "tasks"%ROWTYPE;
  publication_row "task_publication_attempts"%ROWTYPE;
BEGIN
  IF NEW.kind <> 'plan' THEN RETURN NEW; END IF;
  SELECT * INTO task_row FROM "tasks" WHERE "id" = NEW.task_id FOR UPDATE;
  IF NEW.source_format_version = 2 THEN
    IF task_row.id IS NULL OR task_row.status NOT IN ('published', 'imported') OR NOT EXISTS (SELECT 1 FROM "task_issue_snapshots" n WHERE n."id" = NEW.source_snapshot_id AND n."task_id" = NEW.task_id) OR NOT EXISTS (SELECT 1 FROM "task_issue_claims" c WHERE c."task_id" = NEW.task_id AND c."state" = 'claimed' AND c."operator_user_id" = NEW.requester_user_id) THEN
      RAISE EXCEPTION 'planning operation requires its verified source and claimed operator';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO publication_row FROM "task_publication_attempts" WHERE "id" = NEW.publication_attempt_id AND "task_id" = NEW.task_id;
  IF task_row.id IS NULL OR task_row.status <> 'published' OR publication_row.id IS NULL OR publication_row.outcome <> 'created' OR publication_row.repository_id <> task_row.repository_id OR publication_row.repository_node_id <> task_row.repository_node_id THEN
    RAISE EXCEPTION 'planning operation requires its confirmed publication';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER "task_plan_operation_guard" ON "task_operations";
--> statement-breakpoint
CREATE TRIGGER "task_plan_operation_guard" BEFORE INSERT OR UPDATE OF kind, publication_attempt_id, source_snapshot_id, input_hash ON "task_operations" FOR EACH ROW EXECUTE FUNCTION "guard_task_plan_operation"();
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ALTER COLUMN "publication_attempt_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD COLUMN "source_snapshot_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD COLUMN "requester_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD COLUMN "source_format_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_source_format_check" CHECK (("source_format_version" = 1 AND "publication_attempt_id" IS NOT NULL AND "source_snapshot_id" IS NULL) OR ("source_format_version" = 2 AND "source_snapshot_id" IS NOT NULL AND "publication_attempt_id" IS NULL));
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_source_snapshot_fk" FOREIGN KEY ("source_snapshot_id") REFERENCES "task_issue_snapshots" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_requester_fk" FOREIGN KEY ("requester_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_task_id_id_unique" UNIQUE ("task_id", "id");
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" DISABLE TRIGGER "task_planning_decision_immutable";
--> statement-breakpoint
UPDATE "task_planning_decisions" d SET "requester_user_id" = o."requester_user_id" FROM "task_operations" o WHERE o."id" = d."operation_id";
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ENABLE TRIGGER "task_planning_decision_immutable";
--> statement-breakpoint
DROP INDEX "task_planning_decisions_task_unique";
--> statement-breakpoint
CREATE INDEX "task_planning_decisions_task_created_idx" ON "task_planning_decisions" ("task_id", "created_at", "id");
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "planning_decision_id" uuid;
--> statement-breakpoint
UPDATE "tasks" t SET "planning_decision_id" = d."id" FROM "task_planning_decisions" d WHERE d."task_id" = t."id";
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planning_decision_fk" FOREIGN KEY ("id", "planning_decision_id") REFERENCES "task_planning_decisions" ("task_id", "id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "guard_task_planning_decision_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  task_row "tasks"%ROWTYPE;
  publication_row "task_publication_attempts"%ROWTYPE;
  operation_row "task_operations"%ROWTYPE;
BEGIN
  SELECT * INTO task_row FROM "tasks" WHERE "id" = NEW.task_id FOR UPDATE;
  SELECT * INTO operation_row FROM "task_operations" WHERE "id" = NEW.operation_id AND "task_id" = NEW.task_id;
  IF task_row.id IS NULL OR task_row.status NOT IN ('published', 'imported') OR task_row.planning_operation_id <> NEW.operation_id THEN
    RAISE EXCEPTION 'planning decision requires the current published task operation';
  END IF;
  IF NEW.source_format_version = 2 THEN
    IF operation_row.id IS NULL OR operation_row.kind <> 'plan' OR operation_row.source_snapshot_id IS DISTINCT FROM NEW.source_snapshot_id THEN
      RAISE EXCEPTION 'planning decision requires its planning operation';
    END IF;
  ELSE
    SELECT * INTO publication_row FROM "task_publication_attempts" WHERE "id" = NEW.publication_attempt_id AND "task_id" = NEW.task_id;
    IF task_row.status <> 'published' OR publication_row.id IS NULL OR publication_row.outcome <> 'created' OR publication_row.repository_id <> task_row.repository_id OR publication_row.repository_node_id <> task_row.repository_node_id THEN
      RAISE EXCEPTION 'planning decision requires its confirmed publication';
    END IF;
    IF operation_row.id IS NULL OR operation_row.kind <> 'plan' OR operation_row.publication_attempt_id <> NEW.publication_attempt_id THEN
      RAISE EXCEPTION 'planning decision requires its planning operation';
    END IF;
  END IF;
  IF NEW.status <> 'review' OR NEW.approved_by_user_id IS NOT NULL OR NEW.approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'planning decision must enter review';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
ALTER TABLE "task_command_receipts" DROP CONSTRAINT "task_command_receipts_action_check";
--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_action_check" CHECK ("action" IN ('start','send','retryGeneration','resolveRefinement','saveDraft','publish','reconcilePublication','planning.start','planning.retry','planning.selectRoute','planning.approve','source.reconfirm'));
