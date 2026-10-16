ALTER TABLE "task_execution_actions" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_execution_actions" DROP CONSTRAINT "task_execution_actions_position_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "task_execution_actions_position_unique" ON "task_execution_actions" ("plan_id", "position") WHERE "superseded_at" IS NULL;--> statement-breakpoint
ALTER TABLE "task_command_receipts" DROP CONSTRAINT "task_command_receipts_action_check";--> statement-breakpoint
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_action_check" CHECK ("action" IN ('start','send','retryGeneration','resolveRefinement','saveDraft','publish','reconcilePublication','planning.start','planning.retry','planning.selectRoute','planning.approve','planning.replan','source.reconfirm'));
