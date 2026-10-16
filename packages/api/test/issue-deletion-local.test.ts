import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { taskDraftRevisions, taskExecutionRuns, taskIssueSources, taskMessages, taskOperations, taskPublicationAttempts, tasks, projectAssignments } from "../src/infra/database/schema";
import { DrizzleTaskDao } from "../src/infra/database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskFlowDao } from "../src/infra/database/dao/tasks/drizzleTaskFlowDao";
import { approveTaskPublication } from "../src/infra/database/dao/tasks/taskPublicationApproval";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import { TasksController } from "../src/controllers/tasksController";
import { createTasksRouter } from "../src/routers/tasks";
import { issueDeletionFixture, closeIssueDeletion, rejection, resetIssueDeletion, seedDraftRevision, seedRun, seedTask, SESSION, type IssueDeletionFixture } from "./issue-deletion-support";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(f));
afterAll(closeIssueDeletion);

function taskRouter(userId = f.member.id) {
  const taskDao = new DrizzleTaskDao(f.database);
  const repositoryAccess = new RepositoryAccessService(new DrizzleProjectDao(f.database), new DrizzleAccessDao(f.database), f.authorization, f.github);
  return createTasksRouter(new TasksController(taskDao, repositoryAccess)).createCaller({ principal: { userId, sessionId: SESSION }, requestId: "issue-deletion-local" });
}

async function startLocalDeletion(taskId: string, requestKey: string = crypto.randomUUID(), fingerprint?: string, userId: string = f.member.id) {
  const preview = await f.caller(userId).preview({ kind: "task", projectId: f.project.id, taskId });
  return f.caller(userId).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: fingerprint ?? preview.fingerprint, requestKey });
}

describe("issueDeletion local journey", () => {
  it("IT-001 malformed or wrong-project target changes nothing", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const malformed = await rejection(f.caller(f.member.id).start({ target: { kind: "task", projectId: "not-a-uuid", taskId }, fingerprint: "a".repeat(64), requestKey: crypto.randomUUID() }));
    expect(malformed?.code).toBe("BAD_REQUEST");
    const wrongProject = await rejection(f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: crypto.randomUUID() }, fingerprint: "a".repeat(64), requestKey: crypto.randomUUID() }));
    expect(wrongProject?.code).toBe("NOT_FOUND");
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(1);
  });

  it("IT-002 first-message-only local task is removed without GitHub calls", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const start = await startLocalDeletion(taskId);
    expect(start.state).toBe("stopping");
    const before = f.world.fetcher.mock.calls.length;
    await f.drain();
    expect(f.world.fetcher.mock.calls.length).toBe(before);
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(0);
    expect(await f.database.select().from(taskMessages).where(eq(taskMessages.taskId, taskId))).toHaveLength(0);
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.state).toBe("completed");
  });

  it("IT-004 unauthorized start persists no operation or stop", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const preview = await f.caller(f.second.id).preview({ kind: "task", projectId: f.project.id, taskId });
    expect(preview.canDelete).toBe(false);
    const attempt = await rejection(f.caller(f.second.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() }));
    expect(attempt?.code).toBe("FORBIDDEN");
    const operations = await f.database.execute<{ count: number }>(sql`select count(*)::int as count from issue_deletion_operations`);
    expect(operations[0]?.count).toBe(0);
    const before = f.world.fetcher.mock.calls.length;
    await f.drain();
    expect(f.world.fetcher.mock.calls.length).toBe(before);
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(1);
  });

  it("IT-007 repeated start key produces one receipt and cannot retarget", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    const requestKey = crypto.randomUUID();
    const first = await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey });
    const second = await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey });
    expect(second.operationId).toBe(first.operationId);
    await f.drain();
    const otherTask = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const retarget = await rejection(f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId: otherTask }, fingerprint: "b".repeat(64), requestKey }));
    expect(retarget?.code).toBe("CONFLICT");
    expect(await f.database.select().from(tasks).where(eq(tasks.id, otherTask))).toHaveLength(1);
  });

  it("IT-008 stale draft preview after publication fails before local deletion", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    expect(preview.destinations).toEqual(["flow_dev"]);
    await f.database.update(tasks).set({ status: "published" }).where(eq(tasks.id, taskId));
    await f.database.insert(taskIssueSources).values({ id: crypto.randomUUID(), taskId, projectId: f.project.id, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_fixture_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", origin: "flow_dev", publicationAttemptId: null });
    const attempt = await rejection(f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() }));
    expect(attempt?.code).toBe("PRECONDITION_FAILED");
    const operations = await f.database.execute<{ count: number }>(sql`select count(*)::int as count from issue_deletion_operations`);
    expect(operations[0]?.count).toBe(0);
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(1);
  });

  it("IT-024 already-ended generation reconciles as stopped", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    await f.database.insert(taskOperations).values({ id: crypto.randomUUID(), taskId, kind: "generate", state: "succeeded", initiatedSessionId: SESSION, baseTaskVersion: 1 });
    const start = await startLocalDeletion(taskId);
    await f.drain();
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(0);
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.state).toBe("completed");
  });

  it("IT-025 only current run is canceled; cleanup removes run history", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const historical = await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "succeeded" });
    const active = await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "running", worktreeId: "worktree-1" });
    const start = await startLocalDeletion(taskId);
    await f.worker.tick();
    const [canceled] = await f.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.id, active));
    expect(canceled?.state).toBe("canceled");
    const [untouched] = await f.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.id, historical));
    expect(untouched?.state).toBe("succeeded");
    await f.drain();
    const runs = await f.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.taskId, taskId));
    expect(runs).toHaveLength(0);
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.state).toBe("completed");
    expect(status.workStopped).toBe(true);
  });

  it("IT-026 run operator without deletion authority cannot interrupt via start", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const runId = await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "running", worktreeId: "worktree-1" });
    const attempt = await rejection(f.caller(f.second.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: "c".repeat(64), requestKey: crypto.randomUUID() }));
    expect(attempt?.code).toBe("FORBIDDEN");
    const [run] = await f.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.id, runId));
    expect(run?.state).toBe("running");
  });

  it("IT-027 all issue work admissions reject after the start fence", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.admin.id, title: "Admin draft" });
    await seedDraftRevision(f.database, { taskId, authorUserId: f.admin.id });
    const revision = (await f.database.select().from(taskDraftRevisions).where(eq(taskDraftRevisions.taskId, taskId)))[0]!;
    await f.database.update(tasks).set({ currentRevisionId: revision.id }).where(eq(tasks.id, taskId));
    const start = await startLocalDeletion(taskId, crypto.randomUUID(), undefined, f.admin.id);
    expect(start.state).toBe("stopping");
    const router = taskRouter(f.admin.id);
    const send = await rejection(router.send({ projectId: f.project.id, taskId, requestKey: crypto.randomUUID(), expectedVersion: 1, message: "another message" }));
    expect(send).toMatchObject({ code: "CONFLICT", reason: "deletion_fenced" });
    const publish = await approveTaskPublication(f.database, { projectId: f.project.id, taskId, actorUserId: f.admin.id, sessionId: SESSION, requestKey: crypto.randomUUID(), expectedVersion: 1, revisionId: revision.id, repositoryId: "202", repositoryNodeId: "R_202", previewHash: "a".repeat(64), owner: "acme", name: "private", title: "Admin draft", bodyMarkdown: "Body" }).catch((error: unknown) => error);
    expect(publish).toMatchObject({ reason: "deletion_fenced" });
    const draft = await rejection(router.send({ projectId: f.project.id, taskId, requestKey: crypto.randomUUID(), expectedVersion: 1, message: "still blocked" }));
    expect(draft?.code).toBe("CONFLICT");
    await expect(new DrizzleTaskFlowDao(f.database).assertDeletionAdmission(taskId)).rejects.toMatchObject({ reason: "deletion_fenced" });
  });

  it("IT-029 repeated confirmations during stop yield one operation", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "running", worktreeId: "worktree-1" });
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    const first = await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    const second = await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    expect(second.operationId).toBe(first.operationId);
    const operations = await f.database.execute<{ count: number }>(sql`select count(*)::int as count from issue_deletion_operations`);
    expect(operations[0]?.count).toBe(1);
  });

  it("IT-031 concurrent run completion does not admit follow-up work", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "succeeded", worktreeId: "worktree-1" });
    const start = await startLocalDeletion(taskId);
    await f.drain();
    const runRows = await f.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.taskId, taskId));
    expect(runRows).toHaveLength(0);
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.state).toBe("completed");
  });

  it("IT-042 forged actor IDs cannot replace session identity", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    const forged = await f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID(), authorUserId: f.second.id } as never);
    const rows = await f.database.execute<{ initiator_user_id: string }>(sql`select initiator_user_id from issue_deletion_operations`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.initiator_user_id).toBe(f.member.id);
    expect(forged).toBeTruthy();
  });

  it("IT-043 wrong-project preview exposes no protected content", async () => {
    const other = await f.createProject({ githubId: "303", nodeId: "R_303", owner: "acme", name: "other", visibility: "private", archived: false }, "Beta");
    await f.permissions.assign(f.member.id, other.id, f.admin.id);
    const taskId = await seedTask(f.database, { projectId: other.id, authorUserId: f.member.id, title: "Segredo do projeto Beta" });
    const leak = await rejection(f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId }));
    expect(leak?.code).toBe("NOT_FOUND");
    const startLeak = await rejection(f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: "d".repeat(64), requestKey: crypto.randomUUID() }));
    expect(startLeak?.code).toBe("NOT_FOUND");
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(1);
  });

  it("IT-044 membership revoked after preview blocks mutation before side effects", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    expect(preview.canDelete).toBe(true);
    await f.database.delete(projectAssignments).where(and(eq(projectAssignments.userId, f.member.id), eq(projectAssignments.projectId, f.project.id)));
    const attempt = await rejection(f.caller(f.member.id).start({ target: { kind: "task", projectId: f.project.id, taskId }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() }));
    expect(["NOT_FOUND", "FORBIDDEN"]).toContain(attempt?.code);
    const operations = await f.database.execute<{ count: number }>(sql`select count(*)::int as count from issue_deletion_operations`);
    expect(operations[0]?.count).toBe(0);
    const before = f.world.fetcher.mock.calls.length;
    await f.drain();
    expect(f.world.fetcher.mock.calls.length).toBe(before);
    await f.permissions.assign(f.member.id, f.project.id, f.admin.id);
  });

  it("IT-045 expired session blocks status/retry and preserves operation", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    const start = await startLocalDeletion(taskId);
    const anonymous = f.caller(f.member.id, null);
    const blocked = await rejection(anonymous.status({ operationId: start.operationId }));
    expect(blocked?.code).toBe("UNAUTHORIZED");
    const blockedRetry = await rejection(anonymous.retry({ operationId: start.operationId, requestKey: crypto.randomUUID() }));
    expect(blockedRetry?.code).toBe("UNAUTHORIZED");
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.operationId).toBe(start.operationId);
  });

  it("IT-046 newly granted access is recalculated with current authority", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    await f.database.delete(projectAssignments).where(and(eq(projectAssignments.userId, f.member.id), eq(projectAssignments.projectId, f.project.id)));
    const denied = await rejection(f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId }));
    expect(denied?.code).toBe("NOT_FOUND");
    await f.permissions.assign(f.member.id, f.project.id, f.admin.id);
    const preview = await f.caller(f.member.id).preview({ kind: "task", projectId: f.project.id, taskId });
    expect(preview.canDelete).toBe(true);
  });

  it("IT-047 dirty worktree, branch and PR remain unchanged after deletion", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "running", worktreeId: "worktree-dirty" });
    const start = await startLocalDeletion(taskId);
    await f.drain();
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.state).toBe("completed");
    expect(f.world.mutations.filter((mutation) => mutation.includes("branch") || mutation.includes("pull_request") || mutation.includes("pr"))).toHaveLength(0);
    const otherTask = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    expect(await f.database.select().from(tasks).where(eq(tasks.id, otherTask))).toHaveLength(1);
  });

  it("IT-049 disconnected connector leaves recoverable stop and intact worktree", async () => {
    f.runState.fail = true;
    try {
      const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
      await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "running", worktreeId: "worktree-disconnected" });
      const start = await startLocalDeletion(taskId);
      await f.drain();
      const status = await f.caller(f.member.id).status({ operationId: start.operationId });
      expect(status.state).toBe("recoverable");
      expect(status.reason).toBe("unknown_stop");
      expect(status.workStopped).toBe(false);
      expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(1);
    } finally {
      f.runState.fail = false;
    }
  });

  it("IT-051 prepublication worktree survives local-only deletion", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id });
    await seedRun(f.database, { taskId, requestedBy: f.member.id, state: "succeeded", worktreeId: "worktree-prepub" });
    const start = await startLocalDeletion(taskId);
    await f.drain();
    const status = await f.caller(f.member.id).status({ operationId: start.operationId });
    expect(status.state).toBe("completed");
    const attempts = await f.database.select().from(taskPublicationAttempts).where(eq(taskPublicationAttempts.taskId, taskId));
    expect(attempts).toHaveLength(0);
  });
});
