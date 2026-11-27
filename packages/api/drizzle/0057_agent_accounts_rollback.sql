ALTER TABLE "task_terminal_sessions" DROP CONSTRAINT IF EXISTS "task_terminal_sessions_agent_account_id_agent_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "task_terminal_sessions" DROP COLUMN IF EXISTS "agent_account_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "task_agent_accounts";
--> statement-breakpoint
DROP TABLE IF EXISTS "agent_accounts";
