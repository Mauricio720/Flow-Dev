ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "pending_credential_hash";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "pending_credential_ciphertext";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "pending_credential_generation";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "pending_credential_expires_at";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "pending_credential_request_key";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "previous_credential_hash";
--> statement-breakpoint
ALTER TABLE "local_machines" DROP COLUMN IF EXISTS "previous_credential_expires_at";
