DROP INDEX IF EXISTS "local_commands_machine_request_unique";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP CONSTRAINT IF EXISTS "local_commands_protocol_check";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP CONSTRAINT IF EXISTS "local_commands_fence_check";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP CONSTRAINT IF EXISTS "local_commands_state_check";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP CONSTRAINT IF EXISTS "local_commands_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP CONSTRAINT IF EXISTS "local_commands_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP COLUMN IF EXISTS "project_id";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP COLUMN IF EXISTS "actor_id";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP COLUMN IF EXISTS "protocol_version";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP COLUMN IF EXISTS "target";
--> statement-breakpoint
ALTER TABLE "local_commands" DROP COLUMN IF EXISTS "request_key";
