ALTER TABLE "task_capture_leases" ADD CONSTRAINT "task_capture_leases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_draft_revisions_task_id_id_unique" ON "task_draft_revisions" USING btree ("task_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_operations_task_id_id_unique" ON "task_operations" USING btree ("task_id","id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_current_revision_same_task_fk" FOREIGN KEY ("id", "current_revision_id") REFERENCES "task_draft_revisions" ("task_id", "id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_active_operation_same_task_fk" FOREIGN KEY ("id", "active_operation_id") REFERENCES "task_operations" ("task_id", "id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_pending_proposal_same_task_fk" FOREIGN KEY ("id", "pending_proposal_operation_id") REFERENCES "task_operations" ("task_id", "id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE FUNCTION "protect_task_revision_binding"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_revision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "task_draft_revisions" WHERE "task_id" = NEW.task_id AND "id" = NEW.parent_revision_id) THEN
    RAISE EXCEPTION 'revision parent belongs to another task' USING ERRCODE = '23514';
  END IF;
  IF NEW.operation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "task_operations" WHERE "task_id" = NEW.task_id AND "id" = NEW.operation_id) THEN
    RAISE EXCEPTION 'revision operation belongs to another task' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_revision_binding_guard" BEFORE INSERT ON "task_draft_revisions" FOR EACH ROW EXECUTE FUNCTION "protect_task_revision_binding"();
--> statement-breakpoint
CREATE FUNCTION "protect_task_operation_binding"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.base_revision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "task_draft_revisions" WHERE "task_id" = NEW.task_id AND "id" = NEW.base_revision_id) THEN
    RAISE EXCEPTION 'operation revision belongs to another task' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_operation_binding_guard" BEFORE INSERT OR UPDATE ON "task_operations" FOR EACH ROW EXECUTE FUNCTION "protect_task_operation_binding"();
--> statement-breakpoint
CREATE FUNCTION "protect_task_evidence_binding"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "task_operations" WHERE "task_id" = NEW.task_id AND "id" = NEW.operation_id) THEN
    RAISE EXCEPTION 'evidence operation belongs to another task' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_evidence_binding_guard" BEFORE INSERT ON "task_evidence" FOR EACH ROW EXECUTE FUNCTION "protect_task_evidence_binding"();
--> statement-breakpoint
CREATE FUNCTION "protect_task_publication_binding"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "task_operations" WHERE "task_id" = NEW.task_id AND "id" = NEW.operation_id)
    OR NOT EXISTS (SELECT 1 FROM "task_draft_revisions" WHERE "task_id" = NEW.task_id AND "id" = NEW.revision_id) THEN
    RAISE EXCEPTION 'publication binding belongs to another task' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "task_publication_binding_guard" BEFORE INSERT ON "task_publication_attempts" FOR EACH ROW EXECUTE FUNCTION "protect_task_publication_binding"();
