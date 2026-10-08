import type postgres from "postgres";

export const LEGACY = { user: "30000000-0000-4000-8000-000000000001", project: "10000000-0000-4000-8000-000000000001", session: "50000000-0000-4000-8000-000000000001" };
export type LegacyTask = { id: string; operationId: string; attemptId: string; issueId: string; issueNodeId: string | null; issueNumber: number; title?: string; body?: string };

export async function seedLegacyBase(sql: postgres.Sql) {
  await sql`insert into users (id, name, email) values (${LEGACY.user}, 'Author', 'author@test.invalid')`;
  await sql`insert into projects (id, external_key, name, github_repository_id, github_node_id, repository_owner, repository_name, repository_visibility, repository_verified_at) values (${LEGACY.project}, 'legacy', 'Legacy', '101', 'R_fixture_flow', 'acme', 'flow', 'private', now())`;
  await sql`insert into sessions (id, token, user_id, expires_at) values (${LEGACY.session}, 'legacy', ${LEGACY.user}, now() + interval '1 day')`;
}

export async function seedLegacyPublished(sql: postgres.Sql, task: LegacyTask) {
  await sql`insert into tasks (id, project_id, author_user_id, repository_id, repository_node_id, status, version, title) values (${task.id}, ${LEGACY.project}, ${LEGACY.user}, '101', 'R_fixture_flow', 'published', 7, ${task.title ?? "Implement CSV export"})`;
  const revisionId = crypto.randomUUID();
  await sql`insert into task_draft_revisions (id, task_id, revision_number, canonical_draft, created_by_user_id) values (${revisionId}, ${task.id}, 1, ${JSON.stringify({ title: "t" })}::jsonb, ${LEGACY.user})`;
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version) values (${task.operationId}, ${task.id}, 'publish', 'succeeded', ${LEGACY.session}, 6)`;
  await sql`insert into task_publication_attempts (id, task_id, operation_id, revision_id, publisher_user_id, publisher_github_id, repository_id, repository_node_id, approved_owner, approved_name, preview_hash, title_snapshot, body_snapshot, approval_session_id, outcome, issue_id, issue_node_id, issue_number, issue_url, issue_created_at) values (${task.attemptId}, ${task.id}, ${task.operationId}, ${revisionId}, ${LEGACY.user}, '1001', '101', 'R_fixture_flow', 'acme', 'flow', 'hash', ${task.title ?? "Implement CSV export"}, ${task.body ?? "Implement CSV export."}, 'session', 'created', ${task.issueId}, ${task.issueNodeId}, ${task.issueNumber}, ${`https://github.com/acme/flow/issues/${task.issueNumber}`}, '2026-10-01T10:00:00Z')`;
}

export async function seedLegacyPlanning(sql: postgres.Sql, task: LegacyTask, planOperationId: string) {
  const hash = "a".repeat(64);
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, publication_attempt_id, input_hash) values (${planOperationId}, ${task.id}, 'plan', 'succeeded', ${LEGACY.session}, 7, ${task.attemptId}, ${hash})`;
  await sql`insert into task_planning_decisions (id, task_id, publication_attempt_id, operation_id, execution_id, recommended_route, selected_route, decision_source, complexity, summary, reasons, uncertainties, status, approved_by_user_id, approved_at) values (${crypto.randomUUID()}, ${task.id}, ${task.attemptId}, ${planOperationId}, ${crypto.randomUUID()}, 'tech_spec', 'tech_spec', 'AI', 'medium', 'Resumo', ${JSON.stringify(["Motivo"])}::jsonb, ${JSON.stringify(["Incerteza"])}::jsonb, 'review', null, null)`;
  await sql`update task_planning_decisions set status = 'approved', approved_by_user_id = ${LEGACY.user}, approved_at = now() where task_id = ${task.id}`;
  await sql`update tasks set planning_status = 'approved', planning_operation_id = ${planOperationId} where id = ${task.id}`;
}
