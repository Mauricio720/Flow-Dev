ALTER TABLE "local_commands" DROP CONSTRAINT "local_commands_kind_check";--> statement-breakpoint
ALTER TABLE "local_commands" ADD CONSTRAINT "local_commands_kind_check" CHECK ("local_commands"."kind" IN ('prepare','start','inspect','cancel','answer'));
