ALTER TABLE "task_execution_actions" ADD COLUMN "concluded_by" uuid;--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD COLUMN "concluded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_concluded_by_users_id_fk" FOREIGN KEY ("concluded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution_actions" ADD CONSTRAINT "task_execution_actions_conclusion_check" CHECK (("concluded_by" IS NULL) = ("concluded_at" IS NULL));
