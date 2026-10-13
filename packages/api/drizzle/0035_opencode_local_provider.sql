ALTER TABLE "software_connections" DROP CONSTRAINT "software_connections_provider_check";--> statement-breakpoint
ALTER TABLE "software_connections" ADD CONSTRAINT "software_connections_provider_check" CHECK ("provider_kind" IN ('codex','claude','opencode'));
