ALTER TABLE "task_execution_runs" DROP COLUMN "qa_result";--> statement-breakpoint
ALTER TABLE "task_execution_actions" DROP CONSTRAINT "task_execution_actions_kind_check";--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_kind_check" CHECK ("task_execution_actions"."kind" IN ('create_spec','create_tasks','implement_tasks','review_round','review_fix','direct_execute','loop','open_pull_request'));
