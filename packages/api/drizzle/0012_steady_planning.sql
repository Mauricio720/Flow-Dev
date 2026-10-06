ALTER TABLE "tasks" ADD COLUMN "planning_status" text;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "planning_operation_id" uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planning_status_check" CHECK ("planning_status" IS NULL OR ("status" = 'published' AND "planning_status" IN ('in_progress','failed','review','approved')));
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_id_planning_operation_unique" UNIQUE ("id", "planning_operation_id");
--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_action_check" CHECK ("action" IN ('start','send','retryGeneration','resolveRefinement','saveDraft','publish','reconcilePublication','planning.start','planning.retry','planning.selectRoute','planning.approve'));
--> statement-breakpoint
ALTER TABLE "task_operations" ADD COLUMN "publication_attempt_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_operations" ADD COLUMN "input_hash" text;
--> statement-breakpoint
ALTER TABLE "task_operations" DROP CONSTRAINT "task_operations_kind_check";
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_kind_check" CHECK ("kind" IN ('generate','publish','plan'));
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_plan_association_check" CHECK (("kind" = 'plan' AND "publication_attempt_id" IS NOT NULL AND "input_hash" ~ '^[0-9a-f]{64}$') OR ("kind" <> 'plan' AND "publication_attempt_id" IS NULL AND "input_hash" IS NULL));
--> statement-breakpoint
CREATE INDEX "task_operations_task_kind_created_idx" ON "task_operations" ("task_id", "kind", "created_at", "id");
--> statement-breakpoint
ALTER TABLE "task_publication_attempts" ADD CONSTRAINT "task_publication_attempts_task_id_id_unique" UNIQUE ("task_id", "id");
--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_task_publication_fk" FOREIGN KEY ("task_id", "publication_attempt_id") REFERENCES "task_publication_attempts" ("task_id", "id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE FUNCTION "guard_task_plan_operation"() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER "task_plan_operation_guard" BEFORE INSERT OR UPDATE OF kind, publication_attempt_id, input_hash ON "task_operations" FOR EACH ROW EXECUTE FUNCTION "guard_task_plan_operation"();
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planning_operation_fk" FOREIGN KEY ("id", "planning_operation_id") REFERENCES "task_operations" ("task_id", "id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TABLE "task_planning_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "publication_attempt_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  "execution_id" uuid NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "recommended_route" text NOT NULL,
  "selected_route" text NOT NULL,
  "decision_source" text NOT NULL,
  "complexity" text NOT NULL,
  "summary" text NOT NULL,
  "reasons" jsonb NOT NULL,
  "uncertainties" jsonb NOT NULL,
  "status" text DEFAULT 'review' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "approved_by_user_id" uuid,
  "approved_at" timestamptz,
  CONSTRAINT "task_planning_decisions_version_check" CHECK ("version" > 0),
  CONSTRAINT "task_planning_decisions_route_check" CHECK ("recommended_route" IN ('direct_execution','tech_spec','prd') AND "selected_route" IN ('direct_execution','tech_spec','prd')),
  CONSTRAINT "task_planning_decisions_source_check" CHECK (("decision_source" = 'AI' AND "recommended_route" = "selected_route") OR ("decision_source" = 'HUMAN_OVERRIDE' AND "recommended_route" <> "selected_route")),
  CONSTRAINT "task_planning_decisions_complexity_check" CHECK ("complexity" IN ('low','medium','high')),
  CONSTRAINT "task_planning_decisions_content_check" CHECK (length(btrim("summary")) > 0 AND jsonb_typeof("reasons") = 'array' AND jsonb_array_length("reasons") BETWEEN 1 AND 20 AND jsonb_typeof("uncertainties") = 'array' AND jsonb_array_length("uncertainties") BETWEEN 0 AND 20),
  CONSTRAINT "task_planning_decisions_status_check" CHECK (("status" = 'review' AND "approved_by_user_id" IS NULL AND "approved_at" IS NULL) OR ("status" = 'approved' AND "approved_by_user_id" IS NOT NULL AND "approved_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_task_fk" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_author_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_publication_fk" FOREIGN KEY ("task_id", "publication_attempt_id") REFERENCES "task_publication_attempts" ("task_id", "id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "task_planning_decisions" ADD CONSTRAINT "task_planning_decisions_operation_fk" FOREIGN KEY ("task_id", "operation_id") REFERENCES "task_operations" ("task_id", "id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX "task_planning_decisions_task_unique" ON "task_planning_decisions" ("task_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "task_planning_decisions_operation_unique" ON "task_planning_decisions" ("operation_id");
--> statement-breakpoint
CREATE FUNCTION "guard_task_planning_decision"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'planning decisions cannot be deleted';
  END IF;
  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'approved planning decisions are immutable';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.publication_attempt_id IS DISTINCT FROM OLD.publication_attempt_id OR NEW.operation_id IS DISTINCT FROM OLD.operation_id OR NEW.execution_id IS DISTINCT FROM OLD.execution_id OR NEW.recommended_route IS DISTINCT FROM OLD.recommended_route OR NEW.complexity IS DISTINCT FROM OLD.complexity OR NEW.summary IS DISTINCT FROM OLD.summary OR NEW.reasons IS DISTINCT FROM OLD.reasons OR NEW.uncertainties IS DISTINCT FROM OLD.uncertainties OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'planning assessment content is immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (OLD.status = 'review' AND NEW.status = 'approved') THEN
    RAISE EXCEPTION 'invalid planning decision transition';
  END IF;
  IF OLD.status = 'review' AND NEW.status = 'review' AND ((NEW.selected_route IS DISTINCT FROM OLD.selected_route AND NEW.version <> OLD.version + 1) OR (NEW.selected_route = OLD.selected_route AND NEW.version <> OLD.version) OR NEW.approved_by_user_id IS NOT NULL OR NEW.approved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'invalid planning route update';
  END IF;
  IF OLD.status = 'review' AND NEW.status = 'approved' AND (NEW.selected_route IS DISTINCT FROM OLD.selected_route OR NEW.version <> OLD.version OR NEW.decision_source IS DISTINCT FROM OLD.decision_source OR NEW.approved_by_user_id IS NULL OR NEW.approved_at IS NULL) THEN
    RAISE EXCEPTION 'approval cannot change the reviewed route';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_planning_decision_immutable" BEFORE UPDATE OR DELETE ON "task_planning_decisions" FOR EACH ROW EXECUTE FUNCTION "guard_task_planning_decision"();
--> statement-breakpoint
CREATE FUNCTION "guard_task_planning_decision_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER "task_planning_decision_association_guard" BEFORE INSERT ON "task_planning_decisions" FOR EACH ROW EXECUTE FUNCTION "guard_task_planning_decision_insert"();
