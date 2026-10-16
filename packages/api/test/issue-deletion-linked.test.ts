import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tasks } from "../src/infra/database/schema";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, seedTask, type IssueDeletionFixture } from "./issue-deletion-support";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(f));
afterAll(closeIssueDeletion);

async function startLinked() {
  const issueNodeId = `I_${crypto.randomUUID()}`;
  const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id, status: "published", issueNodeId, issueNumber: 41, publicationOutcome: "created" });
  f.world.issue!.nodeId = issueNodeId;
  const target = { kind: "task" as const, projectId: f.project.id, taskId };
  const preview = await f.caller(f.member.id).preview(target);
  const status = await f.caller(f.member.id).start({ target, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
  return { taskId, status };
}

async function settle(taskId: string, operationId: string) {
  await f.drain();
  const status = await f.caller(f.member.id).status({ operationId });
  const [task] = await f.database.select().from(tasks).where(eq(tasks.id, taskId));
  return { status, task };
}

describe("issueDeletion linked journey", () => {
  it("IT-010 keeps a task when repository or Issue identity differs and never removes", async () => {
    const { taskId, status } = await startLinked();
    f.world.issue!.repositoryId = 303;
    const result = await settle(taskId, status.operationId);
    expect(result.status).toMatchObject({ state: "recoverable", reason: "identity_conflict" });
    expect(f.world.mutations).toHaveLength(0);
    expect(result.task).toBeDefined();
    await resetIssueDeletion(f);
    const changed = await startLinked();
    f.world.issue!.number = 42;
    const numberConflict = await settle(changed.taskId, changed.status.operationId);
    expect(numberConflict.status).toMatchObject({ state: "recoverable", reason: "identity_conflict" });
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-011 leaves a published task recoverable when its GitHub node identity is missing", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id, status: "published", publicationOutcome: "created" });
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    const start = await f.caller(f.member.id).start({ target: preview.target, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    const result = await settle(taskId, start.operationId);
    expect(result.status).toMatchObject({ state: "recoverable", reason: "missing_identity" });
    expect(result.task).toBeDefined();
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-012 retains local and remote issues after GitHub refuses removal", async () => {
    const { taskId, status } = await startLinked();
    f.world.removeMode = "forbidden";
    const result = await settle(taskId, status.operationId);
    expect(result.status).toMatchObject({ state: "recoverable", reason: "github_permission_denied", remotePresence: "present" });
    expect(result.task).toBeDefined();
    expect(f.world.issue).not.toBeNull();
  });

  it("IT-014 verifies 410 after a lost accepted response without sending another removal", async () => {
    const { taskId, status } = await startLinked();
    f.world.removeDrop = true;
    const result = await settle(taskId, status.operationId);
    expect(result.status.state).toBe("completed");
    expect(result.task).toBeUndefined();
    expect(f.world.mutations).toEqual(["deleteIssue:accepted"]);
  });

  it("IT-015 purges a linked task when the same repository proves the Issue already absent", async () => {
    const { taskId, status } = await startLinked();
    f.world.issue = null;
    const result = await settle(taskId, status.operationId);
    expect(result.status).toMatchObject({ state: "completed", remotePresence: "absent" });
    expect(result.task).toBeUndefined();
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-016 allows a stable-ID rename and blocks repository transfer", async () => {
    const first = await startLinked();
    f.world.issue!.repositoryName = "renamed";
    expect((await settle(first.taskId, first.status.operationId)).status.state).toBe("completed");
    await resetIssueDeletion(f);
    const second = await startLinked();
    f.world.repoNodeDatabaseId = 303;
    const blocked = await settle(second.taskId, second.status.operationId);
    expect(blocked.status).toMatchObject({ state: "recoverable", reason: "identity_conflict" });
    expect(blocked.task).toBeDefined();
  });
});
