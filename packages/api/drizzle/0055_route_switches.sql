CREATE TABLE "task_route_switches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"planning_decision_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"from_route" text NOT NULL,
	"to_route" text NOT NULL,
	"summary" text NOT NULL,
	"reasons" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"decision_request_key" uuid,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_route_switches_task_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_route_switches_planning_decision_fk" FOREIGN KEY ("planning_decision_id") REFERENCES "public"."task_planning_decisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_route_switches_session_fk" FOREIGN KEY ("session_id") REFERENCES "public"."task_terminal_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "task_route_switches_decided_by_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_route_switches_from_route_check" CHECK ("from_route" IN ('prd','tech_spec')),
	CONSTRAINT "task_route_switches_to_route_check" CHECK ("to_route" = 'direct_execution'),
	CONSTRAINT "task_route_switches_summary_check" CHECK (char_length(btrim("summary")) BETWEEN 1 AND 500),
	CONSTRAINT "task_route_switches_reasons_check" CHECK (jsonb_typeof("reasons") = 'array' AND jsonb_array_length("reasons") BETWEEN 1 AND 8),
	CONSTRAINT "task_route_switches_status_check" CHECK ("status" IN ('pending','confirmed','declined')),
	CONSTRAINT "task_route_switches_decision_check" CHECK (("status" = 'pending' AND "decided_by_user_id" IS NULL AND "decided_at" IS NULL AND "decision_request_key" IS NULL) OR ("status" IN ('confirmed','declined') AND "decided_by_user_id" IS NOT NULL AND "decided_at" IS NOT NULL AND "decision_request_key" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_route_switches_session_pending_unique" ON "task_route_switches" USING btree ("session_id") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX "task_route_switches_decision_confirmed_unique" ON "task_route_switches" USING btree ("planning_decision_id") WHERE "status" = 'confirmed';
--> statement-breakpoint
CREATE INDEX "task_route_switches_task_proposed_idx" ON "task_route_switches" USING btree ("task_id","proposed_at");
