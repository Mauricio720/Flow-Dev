import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import type { SeededProject, SeededUser } from "./seed";

const REPOSITORY = { id: "1296269", nodeId: "MDEwOlJlcG9zaXRvcnkxMjk2MjY5", owner: "octocat", name: "Hello-World", visibility: "public" };
const WORKSPACE_ID = "ws_e2e0000000000001";
const BOARD = { id: "PVT_e2e_board", item: "PVTI_e2e_item", field: "PVTSSF_e2e_status", option: "PVTSSF_e2e_progress" };
const ISSUE_URL = "https://github.com/octocat/Hello-World/issues/1";
const CONTENT_HASH = "a".repeat(64);
type ProjectRow = { id: string; name: string; external_key: string };
type SeedContext = { project: ProjectRow; taskId: string; issueId: string; snapshotId: string; planOperationId: string; decisionId: string; user: SeededUser };
export type SeededExecution = { project: SeededProject; taskId: string; decisionId: string };

export async function seedDirectExecution(sql: Sql, user: SeededUser): Promise<SeededExecution> {
  const context = await createContext(sql, user);
  await seedExecutionRows(sql, context);
  return { project: { id: context.project.id, name: context.project.name, repository: `${REPOSITORY.owner}/${REPOSITORY.name}` }, taskId: context.taskId, decisionId: context.decisionId };
}

async function createContext(sql: Sql, user: SeededUser): Promise<SeedContext> {
  const project = await seedPublicProject(sql);
  const taskId = randomUUID();
  const issueId = `I_E2E_${randomUUID()}`;
  const snapshotId = randomUUID();
  const planOperationId = randomUUID();
  const decisionId = randomUUID();
  return { project, taskId, issueId, snapshotId, planOperationId, decisionId, user };
}

async function seedPublicProject(sql: Sql): Promise<ProjectRow> {
  const key = `e2e-public-${randomUUID()}`;
  const name = `Execução E2E ${key.slice(-8)}`;
  const [project] = await sql<ProjectRow[]>`
    insert into projects (external_key, name, github_repository_id, github_node_id, repository_owner, repository_name, repository_visibility, repository_verified_at)
    values (${key}, ${name}, ${REPOSITORY.id}, ${REPOSITORY.nodeId}, ${REPOSITORY.owner}, ${REPOSITORY.name}, ${REPOSITORY.visibility}, now())
    on conflict (github_repository_id) do update set github_node_id = excluded.github_node_id returning id, name, external_key`;
  return project!;
}

async function seedExecutionRows(sql: Sql, value: SeedContext) {
  await seedTask(sql, value);
  await seedSource(sql, value);
  await seedPlanning(sql, value);
  await seedBinding(sql, value);
}

async function seedTask(sql: Sql, value: SeedContext) {
  await sql`insert into project_assignments (user_id, project_id) values (${value.user.id}, ${value.project.id}) on conflict do nothing`;
  await sql`insert into tasks (id, project_id, repository_id, repository_node_id, origin, status, planning_status, title) values (${value.taskId}, ${value.project.id}, ${REPOSITORY.id}, ${REPOSITORY.nodeId}, 'external', 'imported', 'approved', 'Executar tarefa aprovada')`;
}

async function seedSource(sql: Sql, value: SeedContext) {
  const [source] = await sql<{ id: string }[]>`insert into task_issue_sources (task_id, project_id, repository_id, repository_node_id, issue_node_id, issue_number, issue_url, origin) values (${value.taskId}, ${value.project.id}, ${REPOSITORY.id}, ${REPOSITORY.nodeId}, ${value.issueId}, 1, ${ISSUE_URL}, 'external') returning id`;
  await sql`insert into task_issue_snapshots (id, source_id, task_id, revision, title, body_markdown, github_updated_at, content_hash, verified_at, verified_by_user_id, origin) values (${value.snapshotId}, ${source!.id}, ${value.taskId}, 1, 'Executar tarefa aprovada', 'Corpo da tarefa', now(), ${CONTENT_HASH}, now(), ${value.user.id}, 'external')`;
  await sql`update task_issue_sources set current_snapshot_id = ${value.snapshotId} where id = ${source!.id}`;
  await sql`insert into task_issue_claims (source_id, task_id, project_id, candidate_user_id, operator_user_id, state, board_node_id, board_item_id, status_field_id, option_id, source_snapshot_id, claimed_at) values (${source!.id}, ${value.taskId}, ${value.project.id}, ${value.user.id}, ${value.user.id}, 'claimed', ${BOARD.id}, ${BOARD.item}, ${BOARD.field}, ${BOARD.option}, ${value.snapshotId}, now())`;
}

async function seedPlanning(sql: Sql, value: SeedContext) {
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, publication_attempt_id, input_hash, source_snapshot_id, requester_user_id, source_format_version) values (${value.planOperationId}, ${value.taskId}, 'plan', 'succeeded', ${randomUUID()}, 1, null, ${'b'.repeat(64)}, ${value.snapshotId}, ${value.user.id}, 2)`;
  await sql`update tasks set planning_status = 'review', planning_operation_id = ${value.planOperationId} where id = ${value.taskId}`;
  await sql`insert into task_planning_decisions (id, task_id, publication_attempt_id, source_snapshot_id, source_format_version, requester_user_id, operation_id, execution_id, recommended_route, selected_route, decision_source, complexity, summary, reasons, uncertainties, status) values (${value.decisionId}, ${value.taskId}, null, ${value.snapshotId}, 2, ${value.user.id}, ${value.planOperationId}, ${randomUUID()}, 'direct_execution', 'direct_execution', 'AI', 'low', 'Tarefa pronta para execução direta.', ${sql.json(['Decisão aprovada'])}, ${sql.json([])}, 'review')`;
  await sql`update task_planning_decisions set status = 'approved', approved_by_user_id = ${value.user.id}, approved_at = now() where id = ${value.decisionId}`;
  await sql`update tasks set planning_status = 'approved', planning_decision_id = ${value.decisionId} where id = ${value.taskId}`;
}

async function seedBinding(sql: Sql, value: SeedContext) {
  await sql`insert into project_compozy_bindings (project_id, checkout_path, compozy_workspace_id, state, default_branch, checked_at, updated_by) values (${value.project.id}, '/tmp/flow-dev-e2e-s4', ${WORKSPACE_ID}, 'ready', 'main', now(), ${value.user.id}) on conflict (project_id) do nothing`;
}
