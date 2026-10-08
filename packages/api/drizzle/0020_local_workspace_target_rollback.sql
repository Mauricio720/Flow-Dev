DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM task_execution_actions WHERE workspace_kind = 'local') THEN
    RAISE EXCEPTION 'rollback refused: local workspace targets exist';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "task_execution_actions" DROP CONSTRAINT "task_execution_actions_workspace_check";
--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_workspace_check" CHECK ("workspace_kind" IN ('isolated','existing','new') AND (("workspace_kind" = 'existing') = ("worktree_id" IS NOT NULL)) AND (("workspace_kind" = 'new') = ("worktree_name" IS NOT NULL)));
--> statement-breakpoint
ALTER TABLE "task_execution_actions" DROP COLUMN "local_machine_id", DROP COLUMN "local_link_id", DROP COLUMN "local_link_revision", DROP COLUMN "local_checkout_handle";
