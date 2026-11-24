DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "task_terminal_requests" WHERE "kind" IN ('file_change','extra_permission')) THEN
    RAISE EXCEPTION 'Cannot roll back 0051 while Codex request kinds exist';
  END IF;
  IF EXISTS (SELECT 1 FROM "task_terminal_sessions" WHERE "agent_version" IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot roll back 0051 while agent versions exist';
  END IF;
  IF EXISTS (SELECT 1 FROM "terminal_session_hosts" WHERE "codex_status" IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot roll back 0051 while Codex status exists';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "task_terminal_requests" DROP CONSTRAINT "task_terminal_requests_kind_check";--> statement-breakpoint
ALTER TABLE "task_terminal_requests" ADD CONSTRAINT "task_terminal_requests_kind_check" CHECK ("task_terminal_requests"."kind" IN ('question','permission'));--> statement-breakpoint
ALTER TABLE "terminal_session_hosts" DROP COLUMN "codex_status";--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" DROP COLUMN "agent_version";
