ALTER TABLE "task_execution_plans" ADD COLUMN "execution_mode" text DEFAULT 'loops' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_execution_plans" ADD CONSTRAINT "task_execution_plans_execution_mode_check" CHECK ("task_execution_plans"."execution_mode" IN ('loops','deterministic'));
