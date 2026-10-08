DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM tasks WHERE origin = 'external') OR EXISTS (SELECT 1 FROM task_issue_claims) THEN
		RAISE EXCEPTION 'rollback refused: imported tasks or claims exist';
	END IF;
END $$;
--> statement-breakpoint
DROP TRIGGER task_issue_snapshots_immutable ON task_issue_snapshots;
--> statement-breakpoint
DROP TABLE "task_issue_claim_attempts";
--> statement-breakpoint
DROP TABLE "task_issue_claims";
--> statement-breakpoint
DROP TABLE "task_issue_snapshots";
--> statement-breakpoint
DROP TABLE "task_issue_sources";
--> statement-breakpoint
DROP FUNCTION task_issue_snapshots_immutable();
--> statement-breakpoint
DROP FUNCTION task_issue_claims_operator_immutable();
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_origin_check";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_planning_status_check";
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planning_status_check" CHECK ("planning_status" IS NULL OR ("status" = 'published' AND "planning_status" IN ('in_progress','failed','review','approved')));
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_status_check";
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('generating','awaiting_clarification','draft_ready','generation_failed','publishing','publication_uncertain','published'));
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "author_user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "origin";
