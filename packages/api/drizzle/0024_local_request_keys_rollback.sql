ALTER TABLE "local_project_links" DROP COLUMN "last_request_payload_hash", DROP COLUMN "last_request_key";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN "revocation_payload_hash";
