import { sql } from "drizzle-orm";
import type { Database } from "../../client";

export type CleanupStep = { table: string; description: string; run: (database: Database, taskId: string) => Promise<unknown> };

export const CLEANUP_STEPS: CleanupStep[] = [
  { table: "tasks", description: "Clear task self-references before children are removed", run: (db, taskId) => db.execute(sql`UPDATE tasks SET current_revision_id = NULL, active_operation_id = NULL, pending_proposal_operation_id = NULL, planning_operation_id = NULL, planning_decision_id = NULL WHERE id = ${taskId}`) },
  { table: "local_command_events", description: "Local command events of the task's runs", run: (db, taskId) => db.execute(sql`DELETE FROM local_command_events WHERE command_id IN (SELECT id FROM local_commands WHERE run_id IN (SELECT id FROM task_execution_runs WHERE task_id = ${taskId}))`) },
  { table: "local_commands", description: "Local commands issued for the task's runs", run: (db, taskId) => db.execute(sql`DELETE FROM local_commands WHERE run_id IN (SELECT id FROM task_execution_runs WHERE task_id = ${taskId})`) },
  { table: "local_checkout_locks", description: "Checkout locks held by the task's runs", run: (db, taskId) => db.execute(sql`DELETE FROM local_checkout_locks WHERE run_id IN (SELECT id FROM task_execution_runs WHERE task_id = ${taskId})`) },
  { table: "task_unified_package_approvals", description: "Unified package approvals", run: (db, taskId) => db.execute(sql`DELETE FROM task_unified_package_approvals WHERE package_id IN (SELECT id FROM task_unified_packages WHERE task_id = ${taskId}) OR task_id = ${taskId}`) },
  { table: "task_unified_package_files", description: "Unified package files", run: (db, taskId) => db.execute(sql`DELETE FROM task_unified_package_files WHERE package_id IN (SELECT id FROM task_unified_packages WHERE task_id = ${taskId})`) },
  { table: "task_unified_packages", description: "Unified packages", run: (db, taskId) => db.execute(sql`DELETE FROM task_unified_packages WHERE task_id = ${taskId}`) },
  { table: "task_run_gates", description: "Local run gates", run: (db, taskId) => db.execute(sql`DELETE FROM task_run_gates WHERE run_id IN (SELECT id FROM task_execution_runs WHERE task_id = ${taskId})`) },
  { table: "task_run_evidence", description: "Local run evidence", run: (db, taskId) => db.execute(sql`DELETE FROM task_run_evidence WHERE run_id IN (SELECT id FROM task_execution_runs WHERE task_id = ${taskId})`) },
  { table: "task_execution_runs", description: "Execution runs before their actions cascade", run: (db, taskId) => db.execute(sql`DELETE FROM task_execution_runs WHERE task_id = ${taskId}`) },
  { table: "task_execution_runtime_bindings", description: "Runtime bindings", run: (db, taskId) => db.execute(sql`DELETE FROM task_execution_runtime_bindings WHERE action_id IN (SELECT id FROM task_execution_actions WHERE task_id = ${taskId})`) },
  { table: "task_execution_actions", description: "Execution actions", run: (db, taskId) => db.execute(sql`DELETE FROM task_execution_actions WHERE task_id = ${taskId}`) },
  { table: "task_execution_plan_saves", description: "Plan saves", run: (db, taskId) => db.execute(sql`DELETE FROM task_execution_plan_saves WHERE task_id = ${taskId}`) },
  { table: "task_execution_plans", description: "Execution plans", run: (db, taskId) => db.execute(sql`DELETE FROM task_execution_plans WHERE task_id = ${taskId}`) },
  { table: "task_spec_interactions", description: "Spec runtime interactions", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_interactions WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_events", description: "Spec runtime events", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_events WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_finalizations", description: "Spec finalizations", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_finalizations WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_approvals", description: "Spec approvals", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_approvals WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_documents", description: "Spec package documents", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_documents WHERE package_id IN (SELECT id FROM task_spec_packages WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId}))`) },
  { table: "task_spec_stages", description: "Spec stages", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_stages WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_packages", description: "Spec packages", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_packages WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_commands", description: "Spec commands", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_commands WHERE task_id = ${taskId}`) },
  { table: "task_spec_workspaces", description: "Spec workspaces", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_workspaces WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_attempts", description: "Spec attempts", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_attempts WHERE workflow_id IN (SELECT id FROM task_spec_workflows WHERE task_id = ${taskId})`) },
  { table: "task_spec_workflows", description: "Spec workflows", run: (db, taskId) => db.execute(sql`DELETE FROM task_spec_workflows WHERE task_id = ${taskId}`) },
  { table: "task_artifact_versions", description: "Artifact versions", run: (db, taskId) => db.execute(sql`DELETE FROM task_artifact_versions WHERE artifact_id IN (SELECT id FROM task_artifacts WHERE task_id = ${taskId})`) },
  { table: "task_artifacts", description: "Artifacts", run: (db, taskId) => db.execute(sql`DELETE FROM task_artifacts WHERE task_id = ${taskId}`) },
  { table: "task_terminal_events", description: "Terminal session events", run: (db, taskId) => db.execute(sql`DELETE FROM task_terminal_events WHERE session_id IN (SELECT id FROM task_terminal_sessions WHERE task_id = ${taskId})`) },
  { table: "task_terminal_requests", description: "Terminal session requests", run: (db, taskId) => db.execute(sql`DELETE FROM task_terminal_requests WHERE session_id IN (SELECT id FROM task_terminal_sessions WHERE task_id = ${taskId})`) },
  { table: "task_terminal_messages", description: "Terminal session messages", run: (db, taskId) => db.execute(sql`DELETE FROM task_terminal_messages WHERE session_id IN (SELECT id FROM task_terminal_sessions WHERE task_id = ${taskId})`) },
  { table: "task_terminal_attachments", description: "Terminal attachments", run: (db, taskId) => db.execute(sql`DELETE FROM task_terminal_attachments WHERE task_id = ${taskId}`) },
  { table: "task_terminal_sessions", description: "Terminal sessions", run: (db, taskId) => db.execute(sql`DELETE FROM task_terminal_sessions WHERE task_id = ${taskId}`) },
  { table: "task_planning_decisions", description: "Planning decisions", run: (db, taskId) => db.execute(sql`DELETE FROM task_planning_decisions WHERE task_id = ${taskId}`) },
  { table: "task_evidence", description: "Generation evidence", run: (db, taskId) => db.execute(sql`DELETE FROM task_evidence WHERE task_id = ${taskId}`) },
  { table: "task_tool_activity", description: "Generation tool activity", run: (db, taskId) => db.execute(sql`DELETE FROM task_tool_activity WHERE task_id = ${taskId}`) },
  { table: "task_tool_calls", description: "Generation tool calls", run: (db, taskId) => db.execute(sql`DELETE FROM task_tool_calls WHERE task_id = ${taskId}`) },
  { table: "task_issue_claim_attempts", description: "Claim attempts", run: (db, taskId) => db.execute(sql`DELETE FROM task_issue_claim_attempts WHERE source_id IN (SELECT id FROM task_issue_sources WHERE task_id = ${taskId})`) },
  { table: "task_issue_claims", description: "Issue claims", run: (db, taskId) => db.execute(sql`DELETE FROM task_issue_claims WHERE task_id = ${taskId}`) },
  { table: "task_issue_snapshots", description: "Issue snapshots", run: (db, taskId) => db.execute(sql`DELETE FROM task_issue_snapshots WHERE task_id = ${taskId}`) },
  { table: "task_issue_sources", description: "Issue sources", run: (db, taskId) => db.execute(sql`DELETE FROM task_issue_sources WHERE task_id = ${taskId}`) },
  { table: "task_context_capabilities", description: "Context capabilities", run: (db, taskId) => db.execute(sql`DELETE FROM task_context_capabilities WHERE operation_id IN (SELECT id FROM task_operations WHERE task_id = ${taskId})`) },
  { table: "task_publication_attempts", description: "Publication attempts", run: (db, taskId) => db.execute(sql`DELETE FROM task_publication_attempts WHERE task_id = ${taskId}`) },
  { table: "task_operations", description: "Task operations", run: (db, taskId) => db.execute(sql`DELETE FROM task_operations WHERE task_id = ${taskId}`) },
  { table: "task_command_receipts", description: "Command receipts", run: (db, taskId) => db.execute(sql`DELETE FROM task_command_receipts WHERE task_id = ${taskId}`) },
  { table: "task_repository_snapshots", description: "Repository snapshots", run: (db, taskId) => db.execute(sql`DELETE FROM task_repository_snapshots WHERE task_id = ${taskId}`) },
  { table: "task_capture_leases", description: "Capture leases", run: (db, taskId) => db.execute(sql`DELETE FROM task_capture_leases WHERE task_id = ${taskId}`) },
  { table: "task_images", description: "Draft images", run: (db, taskId) => db.execute(sql`DELETE FROM task_images WHERE task_id = ${taskId}`) },
  { table: "task_draft_revisions", description: "Draft revisions", run: (db, taskId) => db.execute(sql`DELETE FROM task_draft_revisions WHERE task_id = ${taskId}`) },
  { table: "task_messages", description: "Messages", run: (db, taskId) => db.execute(sql`DELETE FROM task_messages WHERE task_id = ${taskId}`) },
  { table: "tasks", description: "The task row itself", run: (db, taskId) => db.execute(sql`DELETE FROM tasks WHERE id = ${taskId}`) },
];

export const CLEANUP_TABLE_ORDER = CLEANUP_STEPS.map((step) => step.table);

const DELETE_BLOCKING_TRIGGERS: Record<string, string> = {
  task_messages: "task_messages_append_only",
  task_draft_revisions: "task_draft_revisions_append_only",
  task_command_receipts: "task_command_receipts_append_only",
  task_evidence: "task_evidence_append_only",
  task_tool_activity: "task_tool_activity_append_only",
  task_planning_decisions: "task_planning_decision_immutable",
  task_spec_workflows: "task_spec_workflow_update_guard",
  task_spec_approvals: "task_spec_approvals_immutable",
  task_spec_documents: "task_spec_documents_immutable",
  task_spec_events: "task_spec_events_immutable",
  task_spec_packages: "task_spec_package_update_guard",
  task_unified_package_files: "task_unified_package_files_immutable",
  task_unified_package_approvals: "task_unified_package_approvals_immutable",
  task_issue_snapshots: "task_issue_snapshots_immutable",
};

export async function purgeTaskRows(database: Database, taskId: string) {
  await database.execute(sql.raw(`ALTER TABLE task_operations DROP CONSTRAINT task_operations_task_publication_fk`));
  for (const [table, trigger] of Object.entries(DELETE_BLOCKING_TRIGGERS)) {
    await database.execute(sql.raw(`ALTER TABLE ${table} DISABLE TRIGGER ${trigger}`));
  }
  for (const step of CLEANUP_STEPS) await step.run(database, taskId);
  for (const [table, trigger] of Object.entries(DELETE_BLOCKING_TRIGGERS)) {
    await database.execute(sql.raw(`ALTER TABLE ${table} ENABLE TRIGGER ${trigger}`));
  }
  await database.execute(sql.raw(`ALTER TABLE task_operations ADD CONSTRAINT task_operations_task_publication_fk FOREIGN KEY (task_id, publication_attempt_id) REFERENCES task_publication_attempts (task_id, id) ON DELETE RESTRICT`));
}
