import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { githubRepositoryAuthorizations, taskExecutionRuns, tasks } from "../src/infra/database/schema";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, seedRun, seedTask, type IssueDeletionFixture } from "./issue-deletion-support";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(async () => {
  await resetIssueDeletion(f);
  await f.authorize(f.member.id);
});
afterAll(closeIssueDeletion);

async function linkedTask(issueNodeId = `I_${crypto.randomUUID()}`) {
  const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id, status: "published", issueNodeId, issueNumber: 41, publicationOutcome: "created" });
  f.world.issue!.nodeId = issueNodeId;
  const target = { kind: "task" as const, projectId: f.project.id, taskId };
  const preview = await f.caller(f.member.id).preview(target);
  const status = await f.caller(f.member.id).start({ target, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
  return { taskId, status };
}

describe("issueDeletion linked recovery", () => {
  it("IT-033 rejects a retry key already bound to another operation", async () => {
    const linked = await linkedTask();
    const localTask = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const localPreview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId: localTask });
    const requestKey = crypto.randomUUID();
    await f.caller(f.member.id).start({ target: localPreview.target, fingerprint: localPreview.fingerprint, requestKey });
    const denied = await f.caller(f.member.id).retry({ operationId: linked.status.operationId, requestKey }).catch((error: { code: string }) => error);
    expect(denied).toMatchObject({ code: "CONFLICT" });
    expect(await f.database.select().from(tasks)).toHaveLength(2);
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-034 persists a 429 retry time and makes no premature provider call", async () => {
    const linked = await linkedTask();
    f.world.removeMode = "rate_limited";
    await f.drain();
    const status = await f.caller(f.member.id).status({ operationId: linked.status.operationId });
    expect(status).toMatchObject({ state: "recoverable", reason: "provider_rate_limited", retryAfterSeconds: 60 });
    const calls = f.world.mutations.length;
    await f.drain();
    expect(f.world.mutations).toHaveLength(calls);
  });

  it("IT-035 retains the task and asks for fresh authorization after OAuth is revoked", async () => {
    const linked = await linkedTask();
    await f.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, f.member.id));
    await f.drain();
    const status = await f.caller(f.member.id).status({ operationId: linked.status.operationId });
    expect(status).toMatchObject({ state: "recoverable", reason: "authorization_needed" });
    expect(await f.database.select().from(tasks).where(eq(tasks.id, linked.taskId))).toHaveLength(1);
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-038 converges repeated retry keys without restarting stopped work", async () => {
    const linked = await linkedTask();
    f.world.removeMode = "forbidden";
    await f.drain();
    const retryKey = crypto.randomUUID();
    const first = await f.caller(f.member.id).retry({ operationId: linked.status.operationId, requestKey: retryKey });
    const second = await f.caller(f.member.id).retry({ operationId: linked.status.operationId, requestKey: retryKey });
    const third = await f.caller(f.member.id).retry({ operationId: linked.status.operationId, requestKey: retryKey });
    expect(first.operationId).toBe(second.operationId);
    expect(second.operationId).toBe(third.operationId);
    expect(first.workStopped).toBe(true);
    await f.drain();
    expect(f.world.mutations).toHaveLength(2);
  });

  it("IT-039 verifies an unknown prior removal before an authorized second mutation", async () => {
    const linked = await linkedTask();
    f.world.removeDrop = true;
    f.world.removeDropApplied = false;
    await f.drain();
    expect(f.world.mutations).toEqual(["deleteIssue:accepted", "deleteIssue:accepted"]);
    expect((await f.caller(f.member.id).status({ operationId: linked.status.operationId })).state).toBe("completed");
  });

  it("IT-040 keeps 404 or inaccessible repository outcomes recoverable", async () => {
    const linked = await linkedTask();
    f.world.issue = null;
    f.world.absenceStatus = 404;
    await f.drain();
    const status = await f.caller(f.member.id).status({ operationId: linked.status.operationId });
    expect(status).toMatchObject({ state: "recoverable", reason: "repository_access_lost", remotePresence: "unknown" });
    expect(await f.database.select().from(tasks).where(eq(tasks.id, linked.taskId))).toHaveLength(1);
  });

  it("IT-050 never removes worktree references or sends branch and PR mutations on retry", async () => {
    const linked = await linkedTask();
    await seedRun(f.database, { taskId: linked.taskId, requestedBy: f.member.id, state: "succeeded", worktreeId: "worktree-kept" });
    f.world.removeMode = "forbidden";
    await f.drain();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await f.caller(f.member.id).retry({ operationId: linked.status.operationId, requestKey: crypto.randomUUID() });
      await f.drain();
    }
    const runs = await f.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.taskId, linked.taskId));
    expect(runs[0]?.worktreeId).toBe("worktree-kept");
    expect(f.world.mutations.every((mutation) => mutation.startsWith("deleteIssue:"))).toBe(true);
  });
});
