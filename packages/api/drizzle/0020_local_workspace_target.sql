ALTER TABLE "task_execution_actions" ADD COLUMN "local_machine_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD COLUMN "local_link_id" uuid;
--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD COLUMN "local_link_revision" integer;
--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD COLUMN "local_checkout_handle" text;
--> statement-breakpoint
ALTER TABLE "task_execution_actions" DROP CONSTRAINT "task_execution_actions_workspace_check";
--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_workspace_check" CHECK ("workspace_kind" IN ('isolated','existing','new','local') AND (("workspace_kind" = 'existing') = ("worktree_id" IS NOT NULL)) AND (("workspace_kind" = 'new') = ("worktree_name" IS NOT NULL)) AND (("workspace_kind" = 'local') = ("local_machine_id" IS NOT NULL AND "local_link_id" IS NOT NULL AND "local_link_revision" IS NOT NULL AND "local_checkout_handle" IS NOT NULL)) AND ("workspace_kind" = 'local' OR ("local_machine_id" IS NULL AND "local_link_id" IS NULL AND "local_link_revision" IS NULL AND "local_checkout_handle" IS NULL)));
