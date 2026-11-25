ALTER TABLE "task_terminal_sessions" DROP CONSTRAINT IF EXISTS "task_terminal_sessions_review_cycle_fk";
--> statement-breakpoint
UPDATE "task_terminal_sessions" SET "purpose" = 'route' WHERE "purpose" IN ('review','review_execute');
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" DROP CONSTRAINT IF EXISTS "task_terminal_sessions_purpose_check";
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" ADD CONSTRAINT "task_terminal_sessions_purpose_check" CHECK ("purpose" IN ('route','generate_tasks','plan_item'));
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" DROP COLUMN IF EXISTS "review_cycle_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "task_review_rounds";
--> statement-breakpoint
DROP TABLE IF EXISTS "task_review_cycles";
