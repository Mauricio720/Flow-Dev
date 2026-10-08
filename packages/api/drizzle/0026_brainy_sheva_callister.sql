CREATE TABLE "local_checkout_locks" (
	"machine_id" uuid NOT NULL,
	"checkout_handle" text NOT NULL,
	"run_id" uuid NOT NULL,
	"fence" integer NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_checkout_locks_machine_id_checkout_handle_pk" PRIMARY KEY("machine_id","checkout_handle"),
	CONSTRAINT "local_checkout_locks_handle_check" CHECK (length("local_checkout_locks"."checkout_handle") between 1 and 128),
	CONSTRAINT "local_checkout_locks_fence_check" CHECK ("local_checkout_locks"."fence" > 0),
	CONSTRAINT "local_checkout_locks_state_check" CHECK ("local_checkout_locks"."state" in ('active','reconciling'))
);
--> statement-breakpoint
ALTER TABLE "local_checkout_locks" ADD CONSTRAINT "local_checkout_locks_machine_id_local_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."local_machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_checkout_locks" ADD CONSTRAINT "local_checkout_locks_run_id_task_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."task_execution_runs"("id") ON DELETE restrict ON UPDATE no action;