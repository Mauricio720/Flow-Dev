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
});
