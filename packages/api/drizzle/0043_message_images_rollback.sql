DELETE FROM "task_images" WHERE "task_id" IS NULL OR "message_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "task_images" DROP CONSTRAINT IF EXISTS "task_images_message_task_check";--> statement-breakpoint
DROP INDEX IF EXISTS "task_images_task_sha_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "task_images_staged_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "task_images_message_idx";--> statement-breakpoint
ALTER TABLE "task_images" DROP COLUMN IF EXISTS "message_id";--> statement-breakpoint
ALTER TABLE "task_images" ALTER COLUMN "task_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "task_images_task_sha_unique" ON "task_images" USING btree ("task_id","sha256");
