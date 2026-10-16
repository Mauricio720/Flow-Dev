CREATE TABLE "task_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" bytea NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_images_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "task_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "task_images_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "task_images_content_type_check" CHECK ("content_type" IN ('image/png','image/jpeg','image/gif','image/webp')),
	CONSTRAINT "task_images_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" = octet_length("content"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_images_task_sha_unique" ON "task_images" USING btree ("task_id","sha256");
