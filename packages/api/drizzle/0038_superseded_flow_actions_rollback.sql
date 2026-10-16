ALTER TABLE "task_command_receipts" DROP CONSTRAINT "task_command_receipts_action_check";
ALTER TABLE "task_command_receipts" ADD CONSTRAINT "task_command_receipts_action_check" CHECK ("action" IN ('start','send','retryGeneration','resolveRefinement','saveDraft','publish','reconcilePublication','planning.start','planning.retry','planning.selectRoute','planning.approve','source.reconfirm'));
DROP INDEX "task_execution_actions_position_unique";
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_position_unique" UNIQUE ("plan_id", "position");
ALTER TABLE "task_execution_actions" DROP COLUMN "superseded_at";
