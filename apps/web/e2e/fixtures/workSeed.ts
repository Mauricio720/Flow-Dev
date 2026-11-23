import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import type { SeededProject, SeededUser } from "./seed";

const PLANNING_REASONS = JSON.stringify(["Mudança pequena e isolada"]);
const GUARDED_TRIGGERS = [["task_planning_decisions", "task_planning_decision_immutable"], ["task_issue_snapshots", "task_issue_snapshots_immutable"], ["task_draft_revisions", "task_draft_revisions_append_only"]] as const;
const BEFORE_PLAN_OPERATIONS = ["task_terminal_attachments", "task_terminal_sessions", "task_images", "task_planning_decisions", "task_issue_claims"] as const;
const AFTER_PLAN_OPERATIONS = ["task_issue_snapshots", "task_issue_sources", "task_publication_attempts", "task_operations", "task_draft_revisions"] as const;

export type SeededWork = { taskId: string; issueNumber: number; imageId: string };

export class WorkSeed {
  private readonly taskIds: string[] = [];

  constructor(private readonly sql: Sql) {}

  async approvedWork(project: SeededProject, operator: SeededUser, body = "Trocar 'Entar' por 'Entrar'"): Promise<SeededWork> {
    const taskId = randomUUID();
    const imageId = randomUUID();
    const sql = this.sql;
    const ids = { revision: randomUUID(), publishOperation: randomUUID(), publication: randomUUID(), source: randomUUID(), snapshot: randomUUID(), planOperation: randomUUID(), decision: randomUUID() };
    const [repository] = await sql`select github_repository_id as id, github_node_id as node from projects where id = ${project.id}`;
    const published = `${body}\n![print do erro](flow-image:${imageId})`;
    await sql`insert into tasks (id, project_id, author_user_id, repository_id, repository_node_id, status, version, title) values (${taskId}, ${project.id}, ${operator.id}, ${repository!.id}, ${repository!.node}, 'published', 1, 'Trocar Entar por Entrar')`;
    await sql`insert into task_draft_revisions (id, task_id, revision_number, canonical_draft, created_by_user_id) values (${ids.revision}, ${taskId}, 1, '{"title":"Trocar"}', ${operator.id})`;
    await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, base_revision_id) values (${ids.publishOperation}, ${taskId}, 'publish', 'succeeded', ${randomUUID()}, 1, ${ids.revision})`;
    await sql`insert into task_publication_attempts (id, task_id, operation_id, revision_id, publisher_user_id, publisher_github_id, repository_id, repository_node_id, approved_owner, approved_name, preview_hash, title_snapshot, body_snapshot, approval_session_id, outcome, issue_id, issue_node_id, issue_number, issue_url) values (${ids.publication}, ${taskId}, ${ids.publishOperation}, ${ids.revision}, ${operator.id}, ${operator.githubId}, ${repository!.id}, ${repository!.node}, 'e2e', 'e2e', ${"a".repeat(64)}, 'Trocar', ${published}, 'session', 'created', '4201', ${`I_${taskId}`}, 42, 'https://github.com/e2e/e2e/issues/42')`;
    await sql`insert into task_issue_sources (id, task_id, project_id, repository_id, repository_node_id, issue_node_id, issue_number, issue_url, origin, publication_attempt_id) values (${ids.source}, ${taskId}, ${project.id}, ${repository!.id}, ${repository!.node}, ${`I_${taskId}`}, 42, 'https://github.com/e2e/e2e/issues/42', 'flow_dev', ${ids.publication})`;
    await sql`insert into task_issue_snapshots (id, source_id, task_id, revision, title, body_markdown, github_updated_at, content_hash, verified_at, origin, publication_attempt_id) values (${ids.snapshot}, ${ids.source}, ${taskId}, 1, 'Trocar Entar por Entrar', ${published}, now(), 'hash', now(), 'flow_dev', ${ids.publication})`;
    await sql`insert into task_issue_claims (source_id, task_id, project_id, candidate_user_id, operator_user_id, state, board_node_id, board_item_id, status_field_id, option_id, source_snapshot_id) values (${ids.source}, ${taskId}, ${project.id}, ${operator.id}, ${operator.id}, 'claimed', 'board', 'item', 'field', 'option', ${ids.snapshot})`;
    await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, source_format_version, source_snapshot_id, requester_user_id, input_hash) values (${ids.planOperation}, ${taskId}, 'plan', 'succeeded', ${randomUUID()}, 1, 2, ${ids.snapshot}, ${operator.id}, ${"b".repeat(64)})`;
    await sql`update tasks set planning_operation_id = ${ids.planOperation} where id = ${taskId}`;
    await sql`insert into task_planning_decisions (id, task_id, source_format_version, source_snapshot_id, requester_user_id, operation_id, execution_id, recommended_route, selected_route, decision_source, complexity, summary, reasons, uncertainties) values (${ids.decision}, ${taskId}, 2, ${ids.snapshot}, ${operator.id}, ${ids.planOperation}, ${randomUUID()}, 'direct_execution', 'direct_execution', 'AI', 'low', 'Resumo', ${PLANNING_REASONS}::text::jsonb, '[]'::jsonb)`;
    await sql`update task_planning_decisions set status = 'approved', approved_by_user_id = ${operator.id}, approved_at = now() where id = ${ids.decision}`;
    await sql`update tasks set planning_status = 'approved', planning_decision_id = ${ids.decision} where id = ${taskId}`;
    await sql`insert into task_images (id, task_id, project_id, uploaded_by_user_id, content_type, byte_size, sha256, content) values (${imageId}, ${taskId}, ${project.id}, ${operator.id}, 'image/png', 11, ${"c".repeat(64)}, ${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])})`;
    this.taskIds.push(taskId);
    return { taskId, issueNumber: 42, imageId };
  }

  async cleanup() {
    for (const taskId of this.taskIds) await this.purge(taskId);
  }

  private async purge(taskId: string) {
    await this.sql.begin(async (sql) => {
      await sql`alter table task_operations drop constraint task_operations_task_publication_fk`;
      for (const [table, trigger] of GUARDED_TRIGGERS) await sql.unsafe(`alter table ${table} disable trigger ${trigger}`);
      await sql`update tasks set current_revision_id = null, active_operation_id = null, planning_operation_id = null, planning_decision_id = null where id = ${taskId}`;
      for (const table of BEFORE_PLAN_OPERATIONS) await sql`delete from ${sql(table)} where task_id = ${taskId}`;
      await sql`delete from task_operations where task_id = ${taskId} and kind = 'plan'`;
      for (const table of AFTER_PLAN_OPERATIONS) await sql`delete from ${sql(table)} where task_id = ${taskId}`;
      await sql`delete from tasks where id = ${taskId}`;
      for (const [table, trigger] of GUARDED_TRIGGERS) await sql.unsafe(`alter table ${table} enable trigger ${trigger}`);
      await sql.unsafe("alter table task_operations add constraint task_operations_task_publication_fk foreign key (task_id, publication_attempt_id) references task_publication_attempts (task_id, id) on delete restrict");
    });
  }
}
