ALTER TABLE "local_machines" ADD COLUMN "last_heartbeat_request_key" uuid;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "last_heartbeat_payload_hash" text;