CREATE TABLE "task_worktree_choices" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"chosen_by_user_id" uuid NOT NULL,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_worktree_choices_task_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "task_worktree_choices_chosen_by_fk" FOREIGN KEY ("chosen_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
	CONSTRAINT "task_worktree_choices_mode_check" CHECK ("mode" IN ('worktree','checkout'))
);
