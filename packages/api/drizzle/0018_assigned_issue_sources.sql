ALTER TABLE "tasks" ADD COLUMN "origin" text DEFAULT 'flow_dev' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "author_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_status_check";
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('generating','awaiting_clarification','draft_ready','generation_failed','publishing','publication_uncertain','published','imported'));
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_planning_status_check";
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planning_status_check" CHECK ("planning_status" IS NULL OR ("status" IN ('published','imported') AND "planning_status" IN ('in_progress','failed','review','approved')));
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_origin_check" CHECK (("origin" = 'flow_dev' AND "author_user_id" IS NOT NULL AND "status" <> 'imported') OR ("origin" = 'external' AND "author_user_id" IS NULL AND "status" = 'imported'));
--> statement-breakpoint
CREATE TABLE "task_issue_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"repository_id" text NOT NULL,
	"repository_node_id" text NOT NULL,
	"issue_node_id" text NOT NULL,
	"issue_number" integer NOT NULL,
	"issue_url" text NOT NULL,
	"origin" text NOT NULL,
	"publication_attempt_id" uuid,
	"current_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_issue_sources_task_id_unique" UNIQUE("task_id"),
	CONSTRAINT "task_issue_sources_identity_unique" UNIQUE("project_id","repository_id","issue_node_id"),
	CONSTRAINT "task_issue_sources_origin_check" CHECK ("task_issue_sources"."origin" in ('flow_dev','external'))
);
--> statement-breakpoint
CREATE TABLE "task_issue_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"title" text NOT NULL,
	"body_markdown" text NOT NULL,
	"github_updated_at" timestamp with time zone NOT NULL,
	"content_hash" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"verified_by_user_id" uuid,
	"origin" text NOT NULL,
	"publication_attempt_id" uuid,
	CONSTRAINT "task_issue_snapshots_source_revision_unique" UNIQUE("source_id","revision"),
	CONSTRAINT "task_issue_snapshots_source_id_unique" UNIQUE("source_id","id"),
	CONSTRAINT "task_issue_snapshots_revision_check" CHECK ("task_issue_snapshots"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "task_issue_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"candidate_user_id" uuid NOT NULL,
	"operator_user_id" uuid,
	"state" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"fence" integer DEFAULT 1 NOT NULL,
	"board_node_id" text NOT NULL,
	"board_item_id" text NOT NULL,
	"status_field_id" text NOT NULL,
	"option_id" text NOT NULL,
	"source_snapshot_id" uuid NOT NULL,
	"last_verified_at" timestamp with time zone,
	"reason" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_issue_claims_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "task_issue_claims_task_id_unique" UNIQUE("task_id"),
	CONSTRAINT "task_issue_claims_state_check" CHECK ("task_issue_claims"."state" in ('unclaimed','pending','uncertain','failed','claimed')),
	CONSTRAINT "task_issue_claims_operator_check" CHECK (("task_issue_claims"."state" = 'claimed') = ("task_issue_claims"."operator_user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "task_issue_claim_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"claimant_user_id" uuid NOT NULL,
	"kind" text DEFAULT 'claim' NOT NULL,
	"request_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"state" text NOT NULL,
	"fence" integer NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"dispatch_started_at" timestamp with time zone,
	"read_back_status" text,
	"failure_code" text,
	"retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_issue_claim_attempts_request_unique" UNIQUE("claimant_user_id","project_id","request_key"),
	CONSTRAINT "task_issue_claim_attempts_state_check" CHECK ("task_issue_claim_attempts"."state" in ('reserved','dispatching','uncertain','confirmed','failed','recorded')),
	CONSTRAINT "task_issue_claim_attempts_kind_check" CHECK ("task_issue_claim_attempts"."kind" in ('claim','reconcile'))
);
--> statement-breakpoint
ALTER TABLE "task_issue_sources" ADD CONSTRAINT "task_issue_sources_task_id_project_id_tasks_id_project_id_fk" FOREIGN KEY ("task_id","project_id") REFERENCES "public"."tasks"("id","project_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_sources" ADD CONSTRAINT "task_issue_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_sources" ADD CONSTRAINT "task_issue_sources_publication_attempt_id_fk" FOREIGN KEY ("publication_attempt_id") REFERENCES "public"."task_publication_attempts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_snapshots" ADD CONSTRAINT "task_issue_snapshots_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."task_issue_sources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_snapshots" ADD CONSTRAINT "task_issue_snapshots_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_snapshots" ADD CONSTRAINT "task_issue_snapshots_verified_by_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_snapshots" ADD CONSTRAINT "task_issue_snapshots_publication_attempt_id_fk" FOREIGN KEY ("publication_attempt_id") REFERENCES "public"."task_publication_attempts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claims" ADD CONSTRAINT "task_issue_claims_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."task_issue_sources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claims" ADD CONSTRAINT "task_issue_claims_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claims" ADD CONSTRAINT "task_issue_claims_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claims" ADD CONSTRAINT "task_issue_claims_candidate_user_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claims" ADD CONSTRAINT "task_issue_claims_operator_user_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claim_attempts" ADD CONSTRAINT "task_issue_claim_attempts_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."task_issue_sources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claim_attempts" ADD CONSTRAINT "task_issue_claim_attempts_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_issue_claim_attempts" ADD CONSTRAINT "task_issue_claim_attempts_claimant_user_id_fk" FOREIGN KEY ("claimant_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "task_issue_claims_project_claimed_idx" ON "task_issue_claims" USING btree ("project_id","claimed_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "task_issue_claim_attempts_unresolved_idx" ON "task_issue_claim_attempts" USING btree ("source_id") WHERE "task_issue_claim_attempts"."kind" = 'claim' and "task_issue_claim_attempts"."state" in ('reserved','dispatching','uncertain');
--> statement-breakpoint
DO $$
DECLARE conflict text;
BEGIN
	SELECT string_agg(DISTINCT a.task_id::text, ',') INTO conflict
	FROM task_publication_attempts a JOIN tasks t ON t.id = a.task_id
	WHERE a.outcome = 'created' AND a.issue_node_id IS NOT NULL
	GROUP BY t.project_id, a.repository_id, a.issue_node_id
	HAVING count(DISTINCT a.task_id) > 1
	LIMIT 1;
	IF conflict IS NOT NULL THEN
		RAISE EXCEPTION 'task_issue_sources binding conflict for tasks %', conflict;
	END IF;
END $$;
--> statement-breakpoint
INSERT INTO "task_issue_sources" ("task_id","project_id","repository_id","repository_node_id","issue_node_id","issue_number","issue_url","origin","publication_attempt_id","created_at")
SELECT a.task_id, t.project_id, a.repository_id, a.repository_node_id, a.issue_node_id, a.issue_number, a.issue_url, 'flow_dev', a.id, COALESCE(a.issue_created_at, a.approved_at)
FROM task_publication_attempts a JOIN tasks t ON t.id = a.task_id
WHERE a.outcome = 'created' AND a.issue_node_id IS NOT NULL AND a.issue_number IS NOT NULL AND a.issue_url IS NOT NULL;
--> statement-breakpoint
INSERT INTO "task_issue_snapshots" ("source_id","task_id","revision","title","body_markdown","github_updated_at","content_hash","verified_at","verified_by_user_id","origin","publication_attempt_id")
SELECT s.id, s.task_id, 1, a.title_snapshot, a.body_snapshot, COALESCE(a.issue_created_at, a.approved_at),
	encode(sha256(convert_to(concat(
		octet_length(convert_to(s.repository_id, 'UTF8')), ':', s.repository_id, E'\n',
		octet_length(convert_to(s.issue_node_id, 'UTF8')), ':', s.issue_node_id, E'\n',
		octet_length(convert_to(a.title_snapshot, 'UTF8')), ':', a.title_snapshot, E'\n',
		octet_length(convert_to(a.body_snapshot, 'UTF8')), ':', a.body_snapshot, E'\n'), 'UTF8')), 'hex'),
	COALESCE(a.issue_created_at, a.approved_at), a.publisher_user_id, 'flow_dev', a.id
FROM task_issue_sources s JOIN task_publication_attempts a ON a.id = s.publication_attempt_id;
--> statement-breakpoint
UPDATE "task_issue_sources" s SET "current_snapshot_id" = (SELECT n.id FROM task_issue_snapshots n WHERE n.source_id = s.id AND n.revision = 1);
--> statement-breakpoint
CREATE FUNCTION task_issue_snapshots_immutable() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'task_issue_snapshots rows are immutable';
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER task_issue_snapshots_immutable BEFORE UPDATE OR DELETE ON task_issue_snapshots FOR EACH ROW EXECUTE FUNCTION task_issue_snapshots_immutable();
--> statement-breakpoint
CREATE FUNCTION task_issue_claims_operator_immutable() RETURNS trigger AS $$
BEGIN
	IF OLD.operator_user_id IS NOT NULL AND NEW.operator_user_id IS DISTINCT FROM OLD.operator_user_id THEN
		RAISE EXCEPTION 'task_issue_claims operator is immutable once assigned';
	END IF;
	RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER task_issue_claims_operator_immutable BEFORE UPDATE ON task_issue_claims FOR EACH ROW EXECUTE FUNCTION task_issue_claims_operator_immutable();
