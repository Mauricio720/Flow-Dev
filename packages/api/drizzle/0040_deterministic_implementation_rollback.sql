ALTER TABLE "task_execution_actions" DROP CONSTRAINT "task_execution_actions_kind_check";
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_kind_check" CHECK ("kind" IN ('create_spec','create_tasks','direct_execute','loop','open_pull_request'));
