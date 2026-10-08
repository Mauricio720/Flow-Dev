ALTER TABLE "local_commands" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "local_commands" ADD COLUMN "actor_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "local_commands" ADD COLUMN "protocol_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "local_commands" ADD COLUMN "target" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "local_commands" ADD COLUMN "request_key" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_commands_machine_request_unique" ON "local_commands" USING btree ("machine_id","request_key");--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_protocol_check" CHECK ("local_commands"."protocol_version" > 0);--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_fence_check" CHECK ("local_commands"."fence" > 0);--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_state_check" CHECK ("local_commands"."state" IN ('queued','leased','accepted','completed','expired'));