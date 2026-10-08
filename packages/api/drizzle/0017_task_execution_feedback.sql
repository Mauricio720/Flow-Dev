ALTER TABLE "task_execution_runs" ADD COLUMN "runtime_event_sequence" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_execution_runs" ADD COLUMN "activity" jsonb;
