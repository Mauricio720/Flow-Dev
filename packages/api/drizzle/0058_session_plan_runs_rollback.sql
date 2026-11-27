DROP TABLE IF EXISTS "task_session_plan_runs";
DROP TABLE IF EXISTS "task_session_plan_item_dependencies";
DELETE FROM "task_session_plan_items" AS item WHERE cardinality(item."task_ids") = 0 AND NOT EXISTS (SELECT 1 FROM "task_terminal_sessions" AS session WHERE session."plan_item_id" = item."id" AND session."started_at" IS NOT NULL);
ALTER TABLE "task_session_plan_items" DROP CONSTRAINT IF EXISTS "task_session_plan_items_task_ids_check";
ALTER TABLE "task_session_plan_items" ADD CONSTRAINT "task_session_plan_items_task_ids_check" CHECK (cardinality("task_session_plan_items"."task_ids") BETWEEN 1 AND 30 AND array_to_string("task_session_plan_items"."task_ids", ',', '#') ~ '^task_[0-9]{2}(,task_[0-9]{2})*$');
