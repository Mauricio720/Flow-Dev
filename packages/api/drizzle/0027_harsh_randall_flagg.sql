ALTER TABLE "local_machines" ADD COLUMN "pending_credential_hash" text;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "pending_credential_ciphertext" text;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "pending_credential_generation" integer;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "pending_credential_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "pending_credential_request_key" uuid;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "previous_credential_hash" text;--> statement-breakpoint
ALTER TABLE "local_machines" ADD COLUMN "previous_credential_expires_at" timestamp with time zone;