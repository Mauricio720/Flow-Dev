DROP INDEX "task_images_task_sha_unique";--> statement-breakpoint
ALTER TABLE "task_images" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "task_images" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "task_images" ADD CONSTRAINT "task_images_message_id_task_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."task_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_images_message_idx" ON "task_images" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "task_images_staged_idx" ON "task_images" USING btree ("project_id","uploaded_by_user_id") WHERE "task_images"."task_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "task_images_task_sha_unique" ON "task_images" USING btree ("task_id","sha256") WHERE "task_images"."message_id" is null;--> statement-breakpoint
ALTER TABLE "task_images" ADD CONSTRAINT "task_images_message_task_check" CHECK ("task_images"."message_id" is null or "task_images"."task_id" is not null);