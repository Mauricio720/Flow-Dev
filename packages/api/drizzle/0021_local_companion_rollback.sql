DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM local_commands) OR EXISTS (SELECT 1 FROM local_project_links) OR EXISTS (SELECT 1 FROM local_pairings) OR EXISTS (SELECT 1 FROM local_machines) OR EXISTS (SELECT 1 FROM task_run_gates) OR EXISTS (SELECT 1 FROM task_run_evidence) THEN
    RAISE EXCEPTION 'rollback refused: local execution records exist';
  END IF;
END $$;
--> statement-breakpoint
DROP TABLE "task_run_evidence";
--> statement-breakpoint
DROP TABLE "task_run_gates";
--> statement-breakpoint
DROP TABLE "local_command_events";
--> statement-breakpoint
DROP TABLE "local_commands";
--> statement-breakpoint
DROP TABLE "local_project_links";
--> statement-breakpoint
DROP TABLE "local_pairings";
--> statement-breakpoint
ALTER TABLE "software_connections" DROP CONSTRAINT "software_connections_machine_id_local_machines_id_fk";
--> statement-breakpoint
DROP TABLE "local_machines";
--> statement-breakpoint
ALTER TABLE "software_connections" DROP CONSTRAINT "software_connections_target_check";
--> statement-breakpoint
ALTER TABLE "software_connections" DROP COLUMN "execution_target", DROP COLUMN "machine_id", DROP COLUMN "owner_user_id";
