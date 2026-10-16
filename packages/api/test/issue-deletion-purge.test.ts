import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tasks } from "../src/infra/database/schema";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, type IssueDeletionFixture } from "./issue-deletion-support";
import { seedSpecFlowTask, seedUnifiedFlowTask } from "./issue-deletion-seed";
import { ISSUE_41 } from "./issue-deletion-world";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(f));
afterAll(closeIssueDeletion);

async function countWhere(table: string, column: string, value: string): Promise<number> {
  const rows = await f.client`select count(*)::int as count from ${f.client(table)} where ${f.client(column)} = ${value}`;
  return Number(rows[0]?.count ?? 0);
}

describe("issueDeletion purge", () => {
  it("IT-003 full populated issue history is purged while unrelated project rows remain", async () => {
    const spec = await seedSpecFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id, messageCount: 100 });
    const unified = await seedUnifiedFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id });
    const otherProject = await f.createProject({ githubId: "404", nodeId: "R_404", owner: "acme", name: "other", visibility: "private", archived: false }, "Gamma");
    await f.permissions.assign(f.member.id, otherProject.id, f.admin.id);
    const unrelated = await f.database.insert(tasks).values({ projectId: otherProject.id, authorUserId: f.member.id, repositoryId: "404", repositoryNodeId: "R_404", title: "Unrelated task" }).returning();

    for (const [index, taskId] of [spec.task, unified.task].entries()) {
      f.world.issue = { ...ISSUE_41, nodeId: index === 0 ? "I_fixture_41" : "I_fixture_42", number: index === 0 ? 41 : 42 };
      const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
      const started = await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
      await f.drain();
      const finalStatus = await f.caller(f.member.id).status({ operationId: started.operationId });
      expect(finalStatus.state, JSON.stringify({ index, finalStatus })).toBe("completed");
    }

    const specTables: [string, string, string][] = [
      ["task_messages", "task_id", spec.task], ["task_draft_revisions", "task_id", spec.task], ["task_command_receipts", "task_id", spec.task],
      ["task_repository_snapshots", "task_id", spec.task], ["task_operations", "task_id", spec.task], ["task_evidence", "task_id", spec.task],
      ["task_tool_activity", "task_id", spec.task], ["task_tool_calls", "task_id", spec.task], ["task_issue_sources", "task_id", spec.task],
      ["task_issue_snapshots", "task_id", spec.task], ["task_issue_claims", "task_id", spec.task], ["task_capture_leases", "task_id", spec.task],
      ["task_publication_attempts", "task_id", spec.task], ["task_planning_decisions", "task_id", spec.task],
      ["task_spec_workflows", "task_id", spec.task], ["task_spec_commands", "task_id", spec.task],
    ];
    for (const [table, column, value] of specTables) {
      expect(await countWhere(table, column, value), `table ${table} retains spec task rows`).toBe(0);
    }
    const unifiedTables: [string, string, string][] = [
      ["tasks", "id", unified.task], ["task_messages", "task_id", unified.task], ["task_issue_sources", "task_id", unified.task],
      ["task_publication_attempts", "task_id", unified.task], ["task_execution_plans", "task_id", unified.task],
      ["task_execution_plan_saves", "task_id", unified.task], ["task_execution_runs", "task_id", unified.task],
      ["task_unified_packages", "task_id", unified.task], ["task_unified_package_approvals", "task_id", unified.task],
      ["local_commands", "run_id", unified.run!], ["local_checkout_locks", "run_id", unified.run!],
      ["task_run_gates", "run_id", unified.run!], ["task_run_evidence", "run_id", unified.run!],
    ];
    for (const [table, column, value] of unifiedTables) {
      expect(await countWhere(table, column, value), `table ${table} retains unified task rows`).toBe(0);
    }
    for (const table of ["task_spec_interactions", "task_spec_events", "task_spec_finalizations", "task_spec_approvals", "task_spec_documents", "task_spec_stages", "task_spec_packages", "task_spec_workspaces", "task_spec_attempts"]) {
      const rows = table === "task_spec_documents"
        ? await f.client`select count(*)::int as count from task_spec_documents where package_id in (select id from task_spec_packages where workflow_id in (select id from task_spec_workflows where task_id = ${spec.task}))`
        : await f.client`select count(*)::int as count from ${f.client(table)} where workflow_id in (select id from task_spec_workflows where task_id = ${spec.task})`;
      expect(Number(rows[0]?.count ?? 0), `table ${table} retains spec workflow rows`).toBe(0);
    }
    for (const table of ["task_unified_package_files", "local_command_events"]) {
      const countRows = await f.client`select count(*)::int as count from ${f.client(table)}`;
      expect(Number(countRows[0]?.count ?? 0), `table ${table} retains rows`).toBe(0);
    }
    const unrelatedRows = await f.database.select().from(tasks).where(eq(tasks.id, unrelated[0]!.id));
    expect(unrelatedRows).toHaveLength(1);
    expect(unrelatedRows[0]!.title).toBe("Unrelated task");
    const receipts = await f.client`select count(*)::int as count from issue_deletion_operations where state = 'completed'`;
    expect(Number(receipts[0]?.count ?? 0)).toBe(2);
  });
});
