import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

describe("issueDeletion route switches", () => {
  it("V-10b deletes pending, confirmed and declined route switches with the Issue", async () => {
    const spec = await seedSpecFlowTask(f.database, f.client, { projectId: f.project.id, authorId: f.member.id, messageCount: 3 });
    const [decision] = await f.client`select id from task_planning_decisions where task_id = ${spec.task}`;
    const sessions = [];
    for (let index = 0; index < 3; index += 1) {
      const [session] = await f.client`insert into task_terminal_sessions (task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty) values (${spec.task}, ${f.project.id}, ${f.member.id}, ${decision!.id}, 'prd', ${crypto.randomUUID()}, '/work/shop', false) returning id`;
      sessions.push(session!.id);
    }
    const statuses = ["pending", "confirmed", "declined"] as const;
    for (const [index, status] of statuses.entries()) {
      await f.client`insert into task_route_switches (task_id, planning_decision_id, session_id, from_route, to_route, summary, reasons, status, decided_by_user_id, decided_at, decision_request_key) values (${spec.task}, ${decision!.id}, ${sessions[index]}, 'prd', 'direct_execution', 'Escopo definido.', '["Sem ambiguidade."]'::jsonb, ${status}, ${status === "pending" ? null : f.member.id}, ${status === "pending" ? null : "2026-11-25T10:06:00.000Z"}, ${status === "pending" ? null : crypto.randomUUID()})`;
    }
    f.world.issue = { ...ISSUE_41, nodeId: "I_fixture_41", number: 41 };
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId: spec.task });
    await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: spec.task }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    await f.drain();
    expect(await countWhere("task_route_switches", "task_id", spec.task)).toBe(0);
  });
});
