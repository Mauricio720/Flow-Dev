import type { Fixture } from "./fixture";

type SeedIds = { task: string; operation: string; revision: string; publication: string; source: string; snapshot: string; run?: string };

export async function seedSpecFlowTask(database: Fixture["database"], client: Fixture["client"], input: { projectId: string; authorId: string; messageCount?: number }) {
  const ids: SeedIds = {
    task: crypto.randomUUID(), operation: crypto.randomUUID(), revision: crypto.randomUUID(),
    publication: crypto.randomUUID(), source: crypto.randomUUID(), snapshot: crypto.randomUUID(),
  };
  const count = input.messageCount ?? 100;
  const sql = client;
  await sql`insert into tasks (id, project_id, author_user_id, repository_id, repository_node_id, status, version, title) values (${ids.task}, ${input.projectId}, ${input.authorId}, '202', 'R_202', 'published', 1, 'Populated spec task')`;
  await sql`insert into task_draft_revisions (id, task_id, revision_number, canonical_draft, created_by_user_id) values (${ids.revision}, ${ids.task}, 1, '{"title":"Populated"}', ${input.authorId})`;
  await sql`update tasks set current_revision_id = ${ids.revision} where id = ${ids.task}`;
  for (let index = 1; index <= count; index += 1) {
    await sql`insert into task_messages (id, task_id, sequence, role, kind, content) values (${crypto.randomUUID()}, ${ids.task}, ${index}, ${index === 1 ? "user" : "assistant"}, ${index === 1 ? "intent" : "result"}, ${`Message ${index}`})`;
  }
  const publicationOperation = crypto.randomUUID();
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, base_revision_id) values (${ids.operation}, ${ids.task}, 'generate', 'succeeded', '00000000-0000-4000-8000-000000000091', 1, ${ids.revision})`;
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, base_revision_id) values (${publicationOperation}, ${ids.task}, 'publish', 'succeeded', '00000000-0000-4000-8000-000000000091', 1, ${ids.revision})`;
  await sql`insert into task_evidence (id, task_id, operation_id, tool_call_id, repository_id, repository_node_id, type, source_hash, excerpt) values (${crypto.randomUUID()}, ${ids.task}, ${ids.operation}, 'tool-1', '202', 'R_202', 'github-issue', 'hash', 'excerpt')`;
  await sql`insert into task_tool_activity (id, task_id, operation_id, execution_id, tool_call_id, tool, target, status, duration_ms, sequence) values (${crypto.randomUUID()}, ${ids.task}, ${ids.operation}, ${crypto.randomUUID()}, 'tool-1', 'read', 'target', 'done', 12, 1)`;
  await sql`insert into task_tool_calls (id, task_id, operation_id, execution_id, tool_call_id, input_hash, result) values (${crypto.randomUUID()}, ${ids.task}, ${ids.operation}, ${crypto.randomUUID()}, 'tool-1', 'hash', '{}')`;
  await sql`insert into task_context_capabilities (execution_id, operation_id, token_hash, fence, expires_at) values (${crypto.randomUUID()}, ${ids.operation}, 'token-hash', 1, now() + interval '1 hour')`;
  await sql`insert into task_capture_leases (user_id, capture_id, session_id, project_id, task_id, token_hash, state, expires_at) values (${input.authorId}, ${crypto.randomUUID()}, 'session', ${input.projectId}, ${ids.task}, 'hash', 'capturing', now() + interval '1 hour')`;
  await sql`insert into task_command_receipts (id, project_id, actor_user_id, action, request_key, payload_hash, task_id, operation_id, accepted_result) values (${crypto.randomUUID()}, ${input.projectId}, ${input.authorId}, 'send', ${crypto.randomUUID()}, 'hash', ${ids.task}, ${ids.operation}, '{}')`;
  await sql`insert into task_repository_snapshots (task_id, repository_owner, repository_name, visibility, archived, verified_at) values (${ids.task}, 'acme', 'private', 'private', false, now())`;
  await sql`insert into task_publication_attempts (id, task_id, operation_id, revision_id, publisher_user_id, publisher_github_id, repository_id, repository_node_id, approved_owner, approved_name, preview_hash, title_snapshot, body_snapshot, approval_session_id, outcome, issue_id, issue_node_id, issue_number, issue_url) values (${ids.publication}, ${ids.task}, ${publicationOperation}, ${ids.revision}, ${input.authorId}, '88', '202', 'R_202', 'acme', 'private', ${"a".repeat(64)}, 'Populated', 'Body', 'session', 'created', '4101', 'I_fixture_41', 41, 'https://github.com/acme/private/issues/41')`;
  await sql`insert into task_issue_sources (id, task_id, project_id, repository_id, repository_node_id, issue_node_id, issue_number, issue_url, origin, publication_attempt_id) values (${ids.source}, ${ids.task}, ${input.projectId}, '202', 'R_202', 'I_fixture_41', 41, 'https://github.com/acme/private/issues/41', 'flow_dev', ${ids.publication})`;
  await sql`insert into task_issue_snapshots (id, source_id, task_id, revision, title, body_markdown, github_updated_at, content_hash, verified_at, origin, publication_attempt_id) values (${ids.snapshot}, ${ids.source}, ${ids.task}, 1, 'Populated', 'Body', now(), 'hash', now(), 'flow_dev', ${ids.publication})`;
  await sql`insert into task_issue_claims (id, source_id, task_id, project_id, candidate_user_id, operator_user_id, state, board_node_id, board_item_id, status_field_id, option_id, source_snapshot_id) values (${crypto.randomUUID()}, ${ids.source}, ${ids.task}, ${input.projectId}, ${input.authorId}, ${input.authorId}, 'claimed', 'board', 'item', 'field', 'option', ${ids.snapshot})`;
  await sql`insert into task_issue_claim_attempts (id, source_id, project_id, claimant_user_id, request_key, payload_hash, state, fence) values (${crypto.randomUUID()}, ${ids.source}, ${input.projectId}, ${input.authorId}, ${crypto.randomUUID()}, 'hash', 'confirmed', 1)`;
  const decision = crypto.randomUUID();
  const planningOperation = crypto.randomUUID();
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, publication_attempt_id, input_hash) values (${planningOperation}, ${ids.task}, 'plan', 'succeeded', '00000000-0000-4000-8000-000000000091', 1, ${ids.publication}, ${"b".repeat(64)})`;
  await sql`update tasks set planning_operation_id = ${planningOperation} where id = ${ids.task}`;
  await sql`insert into task_planning_decisions (id, task_id, publication_attempt_id, requester_user_id, operation_id, execution_id, recommended_route, selected_route, decision_source, complexity, summary, reasons, uncertainties) values (${decision}, ${ids.task}, ${ids.publication}, ${input.authorId}, ${planningOperation}, ${crypto.randomUUID()}, 'tech_spec', 'tech_spec', 'AI', 'low', 'summary', '["reason"]', '[]')`;
  await sql`update task_planning_decisions set status = 'approved', approved_by_user_id = ${input.authorId}, approved_at = now() where id = ${decision}`;
  const workflow = crypto.randomUUID();
  await sql`insert into task_spec_workflows (id, task_id, project_id, author_user_id, publication_id, planning_decision_id, selected_route, current_stage, state) values (${workflow}, ${ids.task}, ${input.projectId}, ${input.authorId}, ${ids.publication}, ${decision}, 'tech_spec', 'tech_spec', 'failed')`;
  const workspace = crypto.randomUUID();
  await sql`insert into task_spec_workspaces (id, workflow_id, repository_github_id, repository_node_id, base_commit, runner_id, checkout_locator, slug, state) values (${workspace}, ${workflow}, '202', 'R_202', ${"c".repeat(40)}, 'runner', 'locator', ${`flow-${"c".repeat(8)}-${"c".repeat(4)}-${"c".repeat(4)}-${"c".repeat(4)}-${"c".repeat(12)}`}, 'ready')`;
  await sql`insert into task_spec_stages (workflow_id, stage, state) values (${workflow}, 'tech_spec', 'failed')`;
  const stageAttempt = crypto.randomUUID();
  await sql`insert into task_spec_attempts (id, workflow_id, stage, attempt_number, kind, input, input_hash, state) values (${stageAttempt}, ${workflow}, 'tech_spec', 1, 'generate', '{}', ${"d".repeat(64)}, 'completed')`;
  const command = crypto.randomUUID();
  await sql`insert into task_spec_commands (id, task_id, project_id, workflow_id, action, actor_user_id, request_key, payload_hash, expected_version, payload, spec_version) values (${command}, ${ids.task}, ${input.projectId}, ${workflow}, 'spec.start', ${input.authorId}, ${crypto.randomUUID()}, ${"e".repeat(64)}, 1, '{}', 1)`;
  const pack = crypto.randomUUID();
  const manifestHash = "f".repeat(64);
  await sql`insert into task_spec_packages (id, workflow_id, stage, attempt_id, revision, manifest_hash, capture_state, package_index, diff_summary) values (${pack}, ${workflow}, 'tech_spec', ${stageAttempt}, 1, ${manifestHash}, 'installed', '{}', '{}')`;
  await sql`insert into task_spec_documents (id, package_id, path, role, source_text, byte_count, sha256, blocks) values (${crypto.randomUUID()}, ${pack}, 'spec.md', 'spec', 'text', 4, ${"a".repeat(64)}, '[]')`;
  await sql`insert into task_spec_approvals (id, workflow_id, stage, package_id, manifest_hash, approver_user_id, installed_manifest_hash) values (${crypto.randomUUID()}, ${workflow}, 'tech_spec', ${pack}, ${manifestHash}, ${input.authorId}, ${manifestHash})`;
  await sql`insert into task_spec_finalizations (id, workflow_id, workspace_id, command_id, attempt_id, source_manifest, target_manifest, file_steps) values (${crypto.randomUUID()}, ${workflow}, ${workspace}, ${command}, ${stageAttempt}, '{}', '{}', '[]')`;
  await sql`insert into task_spec_interactions (id, workflow_id, attempt_id, runtime_session_id, runtime_turn_id, runtime_interaction_id, provider_request_id, kind, description) values (${crypto.randomUUID()}, ${workflow}, ${stageAttempt}, 'session', 'turn', 'interaction', 'request', 'question', 'Question')`;
  await sql`insert into task_spec_events (id, workflow_id, sequence, attempt_id, kind, payload) values (${crypto.randomUUID()}, ${workflow}, 1, ${stageAttempt}, 'event', '{}')`;
  return ids;
}

export async function seedUnifiedFlowTask(database: Fixture["database"], client: Fixture["client"], input: { projectId: string; authorId: string }) {
  const ids: SeedIds = {
    task: crypto.randomUUID(), operation: crypto.randomUUID(), revision: crypto.randomUUID(),
    publication: crypto.randomUUID(), source: crypto.randomUUID(), snapshot: crypto.randomUUID(),
  };
  const sql = client;
  await sql`insert into tasks (id, project_id, author_user_id, repository_id, repository_node_id, status, version, title) values (${ids.task}, ${input.projectId}, ${input.authorId}, '202', 'R_202', 'published', 1, 'Populated unified task')`;
  await sql`insert into task_draft_revisions (id, task_id, revision_number, canonical_draft, created_by_user_id) values (${ids.revision}, ${ids.task}, 1, '{"title":"Populated"}', ${input.authorId})`;
  await sql`update tasks set current_revision_id = ${ids.revision} where id = ${ids.task}`;
  await sql`insert into task_messages (id, task_id, sequence, role, kind, content) values (${crypto.randomUUID()}, ${ids.task}, 1, 'user', 'intent', 'Message 1')`;
  const publicationOperation = crypto.randomUUID();
  await sql`insert into task_operations (id, task_id, kind, state, initiated_session_id, base_task_version, base_revision_id) values (${publicationOperation}, ${ids.task}, 'publish', 'succeeded', '00000000-0000-4000-8000-000000000091', 1, ${ids.revision})`;
  await sql`insert into task_publication_attempts (id, task_id, operation_id, revision_id, publisher_user_id, publisher_github_id, repository_id, repository_node_id, approved_owner, approved_name, preview_hash, title_snapshot, body_snapshot, approval_session_id, outcome, issue_id, issue_node_id, issue_number, issue_url) values (${ids.publication}, ${ids.task}, ${publicationOperation}, ${ids.revision}, ${input.authorId}, '88', '202', 'R_202', 'acme', 'private', ${"a".repeat(64)}, 'Populated', 'Body', 'session', 'created', '4102', 'I_fixture_42', 42, 'https://github.com/acme/private/issues/42')`;
  await sql`insert into task_issue_sources (id, task_id, project_id, repository_id, repository_node_id, issue_node_id, issue_number, issue_url, origin, publication_attempt_id) values (${ids.source}, ${ids.task}, ${input.projectId}, '202', 'R_202', 'I_fixture_42', 42, 'https://github.com/acme/private/issues/42', 'flow_dev', ${ids.publication})`;
  await sql`insert into task_issue_snapshots (id, source_id, task_id, revision, title, body_markdown, github_updated_at, content_hash, verified_at, origin, publication_attempt_id) values (${ids.snapshot}, ${ids.source}, ${ids.task}, 1, 'Populated', 'Body', now(), 'hash', now(), 'flow_dev', ${ids.publication})`;
  const plan = crypto.randomUUID();
  await sql`insert into task_execution_plans (id, task_id, kind, revision, status, created_by) values (${plan}, ${ids.task}, 'os_unified', 1, 'planned', ${input.authorId})`;
  await sql`insert into task_execution_plan_saves (task_id, idempotency_key, request_hash, result_revision) values (${ids.task}, ${crypto.randomUUID()}, 'hash', 1)`;
  const action = crypto.randomUUID();
  await sql`insert into task_execution_actions (id, plan_id, task_id, position, kind, inputs, workspace_kind, state) values (${action}, ${plan}, ${ids.task}, 1, 'create_spec', '{}', 'isolated', 'planned')`;
  const run = crypto.randomUUID();
  await sql`insert into task_execution_runs (id, action_id, task_id, attempt_number, state, snapshot, is_write, idempotency_key, requested_by) values (${run}, ${action}, ${ids.task}, 1, 'succeeded', '{}', true, ${crypto.randomUUID()}, ${input.authorId})`;
  const machine = crypto.randomUUID();
  await sql`insert into local_machines (id, owner_user_id, label, credential_hash, credential_expires_at) values (${machine}, ${input.authorId}, 'Machine', 'hash', now() + interval '1 day')`;
  const connection = crypto.randomUUID();
  await sql`insert into software_connections (id, label, provider_kind, runtime_provider_id, execution_target, machine_id, owner_user_id) values (${connection}, 'Connection', 'claude', 'runtime-id', 'machine', ${machine}, ${input.authorId})`;
  await sql`insert into task_execution_runtime_bindings (action_id, role, connection_id, provider_id, model_id) values (${action}, 'primary', ${connection}, 'provider', 'model')`;
  const packageId = crypto.randomUUID();
  await sql`insert into task_unified_packages (id, task_id, source_run_id, snapshot_id, version, manifest) values (${packageId}, ${ids.task}, ${run}, ${ids.snapshot}, 1, '{}')`;
  await sql`insert into task_unified_package_files (package_id, path, role, source_text, byte_count, sha256, required) values (${packageId}, 'spec.md', 'spec', 'text', 4, 'sha', true)`;
  await sql`insert into task_unified_package_approvals (id, package_id, task_id, version, approver_user_id, idempotency_key) values (${crypto.randomUUID()}, ${packageId}, ${ids.task}, 1, ${input.authorId}, ${crypto.randomUUID()})`;
  const link = crypto.randomUUID();
  await sql`insert into local_project_links (id, owner_user_id, project_id, machine_id, checkout_handle, checkout_key, repository_id, repository_node_id, safe_label) values (${link}, ${input.authorId}, ${input.projectId}, ${machine}, 'handle', 'key', '202', 'R_202', 'Label')`;
  const localCommand = crypto.randomUUID();
  await sql`insert into local_commands (id, machine_id, link_id, project_id, actor_id, run_id, protocol_version, target, request_key, kind, payload, payload_hash, fence, sequence, state, lease_expires_at) values (${localCommand}, ${machine}, ${link}, ${input.projectId}, ${input.authorId}, ${run}, 1, '{}', ${crypto.randomUUID()}, 'start', '{}', ${"b".repeat(64)}, 1, 1, 'completed', now() + interval '1 hour')`;
  await sql`insert into local_command_events (id, command_id, sequence, kind, payload_hash, payload) values (${crypto.randomUUID()}, ${localCommand}, 1, 'terminal', ${"b".repeat(64)}, '{}')`;
  await sql`insert into local_checkout_locks (machine_id, checkout_handle, run_id, fence, state) values (${machine}, 'handle', ${run}, 1, 'active')`;
  await sql`insert into task_run_gates (id, run_id, gate_id, attempt, manifest_hash, required, state, command_digest, checkout_digest) values (${crypto.randomUUID()}, ${run}, 'gate', 1, ${"c".repeat(64)}, true, 'passed', ${"d".repeat(64)}, ${"e".repeat(64)})`;
  await sql`insert into task_run_evidence (id, run_id, kind, relative_label, visibility, content_hash, byte_size) values (${crypto.randomUUID()}, ${run}, 'artifact', 'out.md', 'private', 'hash', 4)`;
  return { ...ids, run };
}
