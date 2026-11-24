import { describe, expect, it } from "vitest";
import { CLEANUP_TABLE_ORDER } from "./deletionPurge";

const TASK_OWNED_TABLES = [
  "tasks", "task_messages", "task_draft_revisions", "task_command_receipts", "task_repository_snapshots",
  "task_operations", "task_evidence", "task_tool_activity", "task_tool_calls",
  "task_issue_sources", "task_issue_snapshots", "task_issue_claims", "task_issue_claim_attempts",
  "task_context_capabilities", "task_capture_leases", "task_publication_attempts", "task_images",
  "task_planning_decisions", "task_terminal_sessions", "task_terminal_attachments",
  "task_terminal_events", "task_artifacts", "task_artifact_versions", "task_session_plans", "task_session_plan_items",
  "task_spec_workflows", "task_spec_workspaces", "task_spec_stages", "task_spec_attempts",
  "task_spec_commands", "task_spec_packages", "task_spec_documents", "task_spec_approvals",
  "task_spec_finalizations", "task_spec_interactions", "task_spec_events",
  "task_execution_actions", "task_execution_runtime_bindings", "task_execution_plans",
  "task_execution_plan_saves", "task_execution_runs", "task_unified_packages",
  "task_unified_package_files", "task_unified_package_approvals",
  "local_commands", "local_command_events", "local_checkout_locks", "task_run_gates", "task_run_evidence",
];

describe("deletion cleanup planner", () => {
  it("UT-024 enumerates every task-owned dependent table before deleting the root task", () => {
    const covered = new Set(CLEANUP_TABLE_ORDER);
    for (const table of TASK_OWNED_TABLES) {
      expect(covered.has(table), `cleanup order is missing table ${table}`).toBe(true);
    }
    expect(CLEANUP_TABLE_ORDER.at(-1)).toBe("tasks");
  });

  it("clears task self-references first and deletes the task row last", () => {
    expect(CLEANUP_TABLE_ORDER[0]).toBe("tasks");
    expect(CLEANUP_TABLE_ORDER.lastIndexOf("tasks")).toBe(CLEANUP_TABLE_ORDER.length - 1);
  });

  it("deletes restricted children before their parents", () => {
    const order = CLEANUP_TABLE_ORDER;
    const before = (child: string, parent: string) => {
      expect(order.lastIndexOf(child), `${child} must be removed before ${parent}`).toBeLessThan(order.lastIndexOf(parent));
    };
    before("task_unified_packages", "task_execution_runs");
    before("task_execution_runs", "task_execution_plans");
    before("task_spec_attempts", "task_spec_workflows");
    before("task_spec_workflows", "tasks");
    before("task_issue_sources", "task_publication_attempts");
    before("task_publication_attempts", "task_operations");
    before("task_operations", "task_draft_revisions");
    before("task_draft_revisions", "tasks");
    before("task_messages", "tasks");
    before("task_planning_decisions", "task_operations");
    before("local_commands", "task_execution_runs");
    before("task_terminal_attachments", "task_terminal_sessions");
    before("task_terminal_events", "task_terminal_sessions");
    before("task_artifact_versions", "task_artifacts");
    before("task_artifact_versions", "task_terminal_sessions");
    before("task_artifacts", "tasks");
    before("task_terminal_sessions", "task_planning_decisions");
    before("task_terminal_sessions", "tasks");
    before("task_session_plan_items", "task_session_plans");
    before("task_session_plans", "tasks");
    before("task_session_plan_items", "task_terminal_sessions");
  });
});
