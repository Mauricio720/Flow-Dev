CREATE TABLE "issue_deletion_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid,
	"repository_id" text NOT NULL,
	"repository_node_id" text NOT NULL,
	"issue_node_id" text,
	"issue_number" integer,
	"initiator_user_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"state" text DEFAULT 'stopping' NOT NULL,
	"remote_presence" text DEFAULT 'unknown' NOT NULL,
	"work_stopped" boolean DEFAULT false NOT NULL,
	"reason" text,
	"retry_at" timestamp with time zone,
	"lease_owner" text,
	"lease_fence" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "issue_deletion_operations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "issue_deletion_operations_state_check" CHECK ("state" IN ('stopping','reconciling','deleting_remote','verifying_remote','cleaning_local','recoverable','completed')),
	CONSTRAINT "issue_deletion_operations_presence_check" CHECK ("remote_presence" IN ('not_applicable','present','absent','unknown')),
	CONSTRAINT "issue_deletion_operations_fence_check" CHECK ("lease_fence" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "issue_deletion_operations_task_unique" ON "issue_deletion_operations" USING btree ("task_id") WHERE "task_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_deletion_operations_identity_unique" ON "issue_deletion_operations" USING btree ("project_id","repository_id","issue_node_id") WHERE "issue_node_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_deletion_operations_receipt_unique" ON "issue_deletion_operations" USING btree ("initiator_user_id","request_key");--> statement-breakpoint
CREATE INDEX "issue_deletion_operations_queue_idx" ON "issue_deletion_operations" USING btree ("state","retry_at","created_at");--> statement-breakpoint
CREATE INDEX "issue_deletion_operations_task_idx" ON "issue_deletion_operations" USING btree ("task_id");--> statement-breakpoint
ALTER TABLE "task_operations" ADD COLUMN "deletion_operation_id" uuid;--> statement-breakpoint
ALTER TABLE "task_operations" DROP CONSTRAINT "task_operations_state_check";--> statement-breakpoint
ALTER TABLE "task_operations" ADD CONSTRAINT "task_operations_state_check" CHECK ("state" IN ('queued','running','succeeded','failed','uncertain','canceled'));
