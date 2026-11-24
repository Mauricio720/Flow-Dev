import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DiskAttachmentFileStore } from "../src/infra/terminal/diskAttachmentFileStore";
import { terminalSessionsRoot } from "../src/infra/terminal/terminalStateRoot";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, type IssueDeletionFixture } from "./issue-deletion-support";
import { seedSpecFlowTask } from "./issue-deletion-seed";
import { ISSUE_41 } from "./issue-deletion-world";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(f));
afterAll(closeIssueDeletion);

async function countWhere(table: string, column: string, value: string): Promise<number> {
  const rows = await f.client`select count(*)::int as count from ${f.client(table)} where ${f.client(column)} = ${value}`;
  return Number(rows[0]?.count ?? 0);
}

describe("issueDeletion terminal files", () => {
  it("V-11a removes terminal sessions, attachments and their files from disk with the Issue", async () => {
    const spec = await seedSpecFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id, messageCount: 3 });
    const [decision] = await f.client`select id from task_planning_decisions where task_id = ${spec.task}`;
    const sessionId = crypto.randomUUID();
    await f.client`insert into task_terminal_sessions (id, task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty) values (${sessionId}, ${spec.task}, ${f.project.id}, ${f.member.id}, ${decision!.id}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false)`;
    const stagedName = crypto.randomUUID();
    for (const [session, name, sha] of [[sessionId, crypto.randomUUID(), "a"], [null, stagedName, "b"]] as const) {
      await f.client`insert into task_terminal_attachments (task_id, user_id, session_id, origin, original_name, stored_name, content_type, byte_size, sha256) values (${spec.task}, ${f.member.id}, ${session}, 'upload', 'a.md', ${name}, 'text/markdown', 3, ${sha.repeat(64)})`;
    }
    const files = new DiskAttachmentFileStore(f.terminalEnv);
    await files.writeStaged(f.member.id, stagedName, new Uint8Array([1, 2, 3]));
    const sessionFolder = join(terminalSessionsRoot(f.terminalEnv), sessionId);
    await mkdir(join(sessionFolder, "contexto", "anexos"), { recursive: true });
    await writeFile(join(sessionFolder, "contexto", "anexos", "01-a.md"), "x");
    f.world.issue = { ...ISSUE_41, nodeId: "I_fixture_41", number: 41 };
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId: spec.task });
    await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: spec.task }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    await f.drain();
    expect(await countWhere("task_terminal_sessions", "task_id", spec.task)).toBe(0);
    expect(await countWhere("task_terminal_attachments", "task_id", spec.task)).toBe(0);
    await expect(stat(sessionFolder)).rejects.toThrow();
    await expect(files.readStaged(f.member.id, stagedName)).rejects.toThrow();
  });

  it("V-20a removes terminal events, artifacts and versions with the Issue and leaves another task intact", async () => {
    const spec = await seedSpecFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id, messageCount: 3 });
    const otherTask = crypto.randomUUID();
    await f.client`insert into tasks (id, project_id, author_user_id, repository_id, repository_node_id, status, version, title) values (${otherTask}, ${f.project.id}, ${f.member.id}, '202', 'R_202', 'draft_ready', 1, 'Outra')`;
    await f.client`insert into task_artifacts (task_id, project_id, relative_path, latest_version) values (${otherTask}, ${f.project.id}, 'docs/spec.md', 0)`;
    const [decision] = await f.client`select id from task_planning_decisions where task_id = ${spec.task}`;
    const [session] = await f.client`insert into task_terminal_sessions (task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty) values (${spec.task}, ${f.project.id}, ${f.member.id}, ${decision!.id}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false) returning id`;
    await f.client`insert into task_terminal_events (session_id, kind, summary) values (${session!.id}, 'started', 'startup')`;
    const [artifact] = await f.client`insert into task_artifacts (task_id, project_id, relative_path, latest_version) values (${spec.task}, ${f.project.id}, 'docs/spec.md', 1) returning id`;
    await f.client`insert into task_artifact_versions (artifact_id, version, skill, session_id, content, sha256, byte_size, trigger) values (${artifact!.id}, 1, 'spec-writer', ${session!.id}, '# Spec', ${"c".repeat(64)}, 6, 'stop')`;
    f.world.issue = { ...ISSUE_41, nodeId: "I_fixture_41", number: 41 };
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId: spec.task });
    await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: spec.task }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    await f.drain();
    expect(await countWhere("task_artifacts", "task_id", spec.task)).toBe(0);
    expect(await countWhere("task_terminal_events", "session_id", session!.id)).toBe(0);
    expect(await countWhere("task_artifact_versions", "artifact_id", artifact!.id)).toBe(0);
    expect(await countWhere("task_artifacts", "task_id", otherTask)).toBe(1);
  });

  it("V-27d removes the messages and requests of a Flow Dev session with the Issue", async () => {
    const spec = await seedSpecFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id, messageCount: 3 });
    const [decision] = await f.client`select id from task_planning_decisions where task_id = ${spec.task}`;
    const [session] = await f.client`insert into task_terminal_sessions (task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty, runtime, host_id) values (${spec.task}, ${f.project.id}, ${f.member.id}, ${decision!.id}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false, 'flow_dev', 'm:a') returning id`;
    for (const role of ["user", "assistant", "system"]) await f.client`insert into task_terminal_messages (session_id, role, content) values (${session!.id}, ${role}, 'oi')`;
    for (const kind of ["question", "permission", "file_change", "extra_permission"]) await f.client`insert into task_terminal_requests (session_id, kind, tool_use_id, payload) values (${session!.id}, ${kind}, 'toolu_1', '{}'::jsonb)`;
    f.world.issue = { ...ISSUE_41, nodeId: "I_fixture_41", number: 41 };
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId: spec.task });
    await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: spec.task }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    await f.drain();
    expect(await countWhere("task_terminal_messages", "session_id", session!.id)).toBe(0);
    expect(await countWhere("task_terminal_requests", "session_id", session!.id)).toBe(0);
    expect(await countWhere("task_terminal_sessions", "task_id", spec.task)).toBe(0);
  });
  it("V-36c removes the execution plan, its items and the sessions linked to them with the Issue", async () => {
    const spec = await seedSpecFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id, messageCount: 3 });
    const [decision] = await f.client`select id from task_planning_decisions where task_id = ${spec.task}`;
    const [plan] = await f.client`insert into task_session_plans (task_id, tasks_folder, manifest_version, updated_by) values (${spec.task}, 'docs/specs/login', 1, ${f.member.id}) returning id`;
    const [item] = await f.client`insert into task_session_plan_items (plan_id, position, task_ids, agent, model, effort) values (${plan!.id}, 1, ${["task_01"]}, 'claude', 'opus', 'max') returning id`;
    await f.client`insert into task_terminal_sessions (task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty, purpose, plan_item_id) values (${spec.task}, ${f.project.id}, ${f.member.id}, ${decision!.id}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false, 'plan_item', ${item!.id})`;
    f.world.issue = { ...ISSUE_41, nodeId: "I_fixture_41", number: 41 };
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId: spec.task });
    await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: spec.task }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    await f.drain();
    expect(await countWhere("task_session_plans", "task_id", spec.task)).toBe(0);
    expect(await countWhere("task_session_plan_items", "id", item!.id)).toBe(0);
    expect(await countWhere("task_terminal_sessions", "task_id", spec.task)).toBe(0);
  });
});
