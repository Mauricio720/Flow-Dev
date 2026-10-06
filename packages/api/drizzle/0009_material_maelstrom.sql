CREATE TABLE "task_tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"tool_call_id" text NOT NULL,
	"input_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_tool_calls_execution_call_unique" UNIQUE("execution_id","tool_call_id")
);
--> statement-breakpoint
ALTER TABLE "task_context_capabilities" ADD COLUMN "pinned_commit_sha" text;--> statement-breakpoint
ALTER TABLE "task_tool_calls" ADD CONSTRAINT "task_tool_calls_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tool_calls" ADD CONSTRAINT "task_tool_calls_operation_id_task_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."task_operations"("id") ON DELETE restrict ON UPDATE no action;