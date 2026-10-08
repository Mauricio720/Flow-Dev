ALTER TABLE "local_machines" ADD COLUMN "revocation_payload_hash" text;--> statement-breakpoint
ALTER TABLE "local_project_links" ADD COLUMN "last_request_key" uuid;--> statement-breakpoint
ALTER TABLE "local_project_links" ADD COLUMN "last_request_payload_hash" text;