ALTER TABLE "task_terminal_sessions" ADD COLUMN "agent_version" text;--> statement-breakpoint
ALTER TABLE "terminal_session_hosts" ADD COLUMN "codex_status" jsonb;--> statement-breakpoint
ALTER TABLE "task_terminal_requests" DROP CONSTRAINT "task_terminal_requests_kind_check";--> statement-breakpoint
ALTER TABLE "task_terminal_requests" ADD CONSTRAINT "task_terminal_requests_kind_check" CHECK ("task_terminal_requests"."kind" IN ('question','permission','file_change','extra_permission'));
