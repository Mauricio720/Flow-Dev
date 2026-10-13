ALTER TABLE "task_execution_actions" DROP CONSTRAINT IF EXISTS "task_execution_actions_conclusion_check";
ALTER TABLE "task_execution_actions" DROP CONSTRAINT IF EXISTS "task_execution_actions_concluded_by_users_id_fk";
ALTER TABLE "task_execution_actions" DROP COLUMN IF EXISTS "concluded_at";
ALTER TABLE "task_execution_actions" DROP COLUMN IF EXISTS "concluded_by";
