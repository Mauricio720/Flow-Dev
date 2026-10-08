DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM task_operations WHERE source_format_version = 2) OR EXISTS (SELECT 1 FROM task_planning_decisions WHERE source_format_version = 2) THEN
    RAISE EXCEPTION 'rollback refused: source-aware planning records exist';
  END IF;
END $$;
--> statement-breakpoint
DROP TRIGGER "task_plan_operation_guard" ON "task_operations";
--> statement-breakpoint
ALTER TABLE "task_command_receipts" DROP CONSTRAINT "task_command_receipts_action_check";
--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_action_check" CHECK ("action" IN ('start','send','retryGeneration','resolveRefinement','saveDraft','publish','reconcilePublication','planning.start','planning.retry','planning.selectRoute','planning.approve'));
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_planning_decision_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "planning_decision_id";
--> statement-breakpoint
DROP INDEX "task_planning_decisions_task_created_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "task_planning_decisions_task_unique" ON "task_planning_decisions" ("task_id");
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" DROP CONSTRAINT "task_planning_decisions_task_id_id_unique";
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" DROP COLUMN "source_format_version", DROP COLUMN "requester_user_id", DROP COLUMN "source_snapshot_id";
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ALTER COLUMN "publication_attempt_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_operations" DROP CONSTRAINT "task_operations_plan_association_check";
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_plan_association_check" CHECK (("kind" = 'plan' AND "publication_attempt_id" IS NOT NULL AND "input_hash" ~ '^[0-9a-f]{64}$') OR ("kind" <> 'plan' AND "publication_attempt_id" IS NULL AND "input_hash" IS NULL));
--> statement-breakpoint
ALTER TABLE "task_operations" DROP COLUMN "source_format_version", DROP COLUMN "requester_user_id", DROP COLUMN "source_snapshot_id";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "guard_task_plan_operation"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  task_row "tasks"%ROWTYPE;
  publication_row "task_publication_attempts"%ROWTYPE;
BEGIN
  IF NEW.kind <> 'plan' THEN RETURN NEW; END IF;
  SELECT * INTO task_row FROM "tasks" WHERE "id" = NEW.task_id FOR UPDATE;
  SELECT * INTO publication_row FROM "task_publication_attempts" WHERE "id" = NEW.publication_attempt_id AND "task_id" = NEW.task_id;
  IF task_row.id IS NULL OR task_row.status <> 'published' OR publication_row.id IS NULL OR publication_row.outcome <> 'created' OR publication_row.repository_id <> task_row.repository_id OR publication_row.repository_node_id <> task_row.repository_node_id THEN
    RAISE EXCEPTION 'planning operation requires its confirmed publication';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "guard_task_planning_decision_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  task_row "tasks"%ROWTYPE;
  publication_row "task_publication_attempts"%ROWTYPE;
  operation_row "task_operations"%ROWTYPE;
BEGIN
  SELECT * INTO task_row FROM "tasks" WHERE "id" = NEW.task_id FOR UPDATE;
  SELECT * INTO publication_row FROM "task_publication_attempts" WHERE "id" = NEW.publication_attempt_id AND "task_id" = NEW.task_id;
  SELECT * INTO operation_row FROM "task_operations" WHERE "id" = NEW.operation_id AND "task_id" = NEW.task_id;
  IF task_row.id IS NULL OR task_row.status <> 'published' OR task_row.planning_operation_id <> NEW.operation_id THEN
    RAISE EXCEPTION 'planning decision requires the current published task operation';
  END IF;
  IF publication_row.id IS NULL OR publication_row.outcome <> 'created' OR publication_row.repository_id <> task_row.repository_id OR publication_row.repository_node_id <> task_row.repository_node_id THEN
    RAISE EXCEPTION 'planning decision requires its confirmed publication';
  END IF;
  IF operation_row.id IS NULL OR operation_row.kind <> 'plan' OR operation_row.publication_attempt_id <> NEW.publication_attempt_id THEN
    RAISE EXCEPTION 'planning decision requires its planning operation';
  END IF;
  IF NEW.status <> 'review' OR NEW.approved_by_user_id IS NOT NULL OR NEW.approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'planning decision must enter review';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_plan_operation_guard" BEFORE INSERT OR UPDATE OF kind, publication_attempt_id, input_hash ON "task_operations" FOR EACH ROW EXECUTE FUNCTION "guard_task_plan_operation"();
