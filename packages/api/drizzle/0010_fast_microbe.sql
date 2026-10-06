ALTER TABLE "task_operations" ALTER COLUMN "initiated_session_id" SET DATA TYPE uuid USING "initiated_session_id"::uuid;
