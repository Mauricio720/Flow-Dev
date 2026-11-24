ALTER TABLE "task_terminal_sessions" ADD COLUMN "prepared_at" timestamp with time zone;--> statement-breakpoint
UPDATE "task_terminal_sessions" SET "prepared_at" = "opened_at" WHERE "status" IN ('opening','unconfirmed');
