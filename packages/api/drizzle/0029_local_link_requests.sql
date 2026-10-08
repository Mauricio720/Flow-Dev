CREATE TABLE "local_link_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"machine_id" uuid,
	"expected_revision" integer NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_link_requests_state_check" CHECK ("local_link_requests"."state" IN ('pending', 'claimed', 'linked', 'failed')),
	CONSTRAINT "local_link_requests_revision_check" CHECK ("local_link_requests"."expected_revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "local_link_requests" ADD CONSTRAINT "local_link_requests_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_link_requests" ADD CONSTRAINT "local_link_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_link_requests" ADD CONSTRAINT "local_link_requests_machine_id_local_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."local_machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "local_link_requests_owner_idx" ON "local_link_requests" USING btree ("owner_user_id","created_at");