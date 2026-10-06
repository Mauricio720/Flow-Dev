import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskCommandReceipts, taskDraftRevisions, taskOperations, tasks } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { currentTask, planningBase, planningCaller, publishedTask, rejection, seedPlanOperation, seedReview } from "./planning-support";

afterEach(closeTaskFixture);

const planOperations = (setup: Awaited<ReturnType<typeof publishedTask>>) => setup.database.select().from(taskOperations).where(eq(taskOperations.kind, "plan"));

describe("planning start and retry with PostgreSQL", () => {
  it("IT-004 accepts one of two concurrent starts and conflicts the other", async () => {
    const setup = await publishedTask();
    const caller = planningCaller(setup);
    const results = await Promise.allSettled([caller.planning.start(planningBase(setup)), caller.planning.start(planningBase(setup))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason.code).toBe("CONFLICT");
    expect(await planOperations(setup)).toHaveLength(1);
  });

  it("IT-005 returns identical receipts for concurrent same-key starts", async () => {
    const setup = await publishedTask();
    const input = planningBase(setup);
    const caller = planningCaller(setup);
    const [first, second] = await Promise.all([caller.planning.start(input), caller.planning.start(input)]);
    expect(first).toEqual(second);
    expect(await planOperations(setup)).toHaveLength(1);
  });

  it("IT-006 rejects a reused key with another version or task", async () => {
    const setup = await publishedTask();
    const input = planningBase(setup);
    const caller = planningCaller(setup);
    await caller.planning.start(input);
    expect(await rejection(caller.planning.start({ ...input, expectedVersion: 8 }))).toMatchObject({ code: "CONFLICT", reason: "request_key_reused" });
    expect(await planOperations(setup)).toHaveLength(1);
  });

  it("IT-007 rolls back a start whose receipt cannot be saved", async () => {
    const setup = await publishedTask();
    await setup.database.execute(`CREATE FUNCTION fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'receipt failure'; END; $$` as never);
    await setup.database.execute(`CREATE TRIGGER fail_receipt BEFORE INSERT ON task_command_receipts FOR EACH ROW EXECUTE FUNCTION fail_receipt()` as never);
    expect(await rejection(planningCaller(setup).planning.start(planningBase(setup)))).toMatchObject({ code: "INTERNAL_SERVER_ERROR", reason: "service_unavailable" });
    expect(await planOperations(setup)).toHaveLength(0);
    expect(await currentTask(setup)).toMatchObject({ planningStatus: null, version: 7 });
  });

  it("IT-008 and IT-009 recover accepted submissions without writes", async () => {
    const setup = await publishedTask();
    const input = planningBase(setup);
    const caller = planningCaller(setup);
    const query = { projectId: input.projectId, taskId: input.taskId, requestKey: input.requestKey, action: "planning.start" as const };
    expect(await caller.planning.submission(query)).toEqual({ status: "not_accepted" });
    const receipt = await caller.planning.start(input);
    expect(await caller.planning.submission(query)).toEqual({ status: "accepted", receipt });
    expect(await setup.database.select().from(taskCommandReceipts)).toHaveLength(1);
  });

  it("IT-010 rejects a sixth active plan for the same author with a 30 second hint", async () => {
    const setup = await publishedTask();
    const tasksValues = Array.from({ length: 5 }, (_, index) => ({ id: `00000000-0000-4000-8000-00000000b00${index}`, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "published", version: 3, title: "Ativa" }));
    await setup.database.insert(tasks).values(tasksValues);
    for (const task of tasksValues) await insertActivePlan(setup, task.id);
    expect(await rejection(planningCaller(setup).planning.start(planningBase(setup)))).toEqual({ code: "TOO_MANY_REQUESTS", reason: "planning_capacity", retryAfterSeconds: 30 });
  });

  it("IT-012, IT-013 and IT-014 reject start in non-awaiting states", async () => {
    const running = await publishedTask();
    await seedPlanOperation(running, "running");
    expect(await rejection(planningCaller(running).planning.start(planningBase(running)))).toMatchObject({ code: "CONFLICT", reason: "operation_active" });
    await closeTaskFixture();
    const review = await publishedTask();
    await seedReview(review);
    expect(await rejection(planningCaller(review).planning.start(planningBase(review)))).toMatchObject({ reason: "planning_exists" });
    await closeTaskFixture();
    const failed = await publishedTask();
    await seedPlanOperation(failed, "failed", undefined, "failed");
    expect(await rejection(planningCaller(failed).planning.start(planningBase(failed)))).toMatchObject({ reason: "planning_retry_required" });
  });

  it("IT-015 and IT-016 reject unusable and oversized snapshots without work", async () => {
    const setup = await publishedTask("created", 7, "x".repeat(65_537));
    expect(await rejection(planningCaller(setup).planning.start(planningBase(setup)))).toMatchObject({ code: "BAD_REQUEST", reason: "planning_input_limit" });
    await setup.database.update(tasks).set({ status: "draft_ready" }).where(eq(tasks.id, setup.taskId));
    expect(await rejection(planningCaller(setup).planning.start(planningBase(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "publication_required" });
    expect(await planOperations(setup)).toHaveLength(0);
  });

  it("IT-017 and IT-018 retry the current failure once", async () => {
    const setup = await publishedTask();
    await seedPlanOperation(setup, "failed", undefined, "failed");
    const input = { ...planningBase(setup), failedOperationId: "00000000-0000-4000-8000-0000000000a1" };
    const caller = planningCaller(setup);
    const [first, second] = await Promise.all([caller.planning.retry(input), caller.planning.retry(input)]);
    expect(first).toEqual(second);
    const operations = await planOperations(setup);
    expect(operations.map((operation) => operation.state).sort()).toEqual(["failed", "queued"]);
  });

  it("IT-019 and IT-020 reject stale and non-failed retries", async () => {
    const stale = await publishedTask();
    await seedPlanOperation(stale, "failed", undefined, "failed");
    expect(await rejection(planningCaller(stale).planning.retry({ ...planningBase(stale), failedOperationId: crypto.randomUUID() }))).toMatchObject({ code: "CONFLICT", reason: "planning_not_failed" });
    await closeTaskFixture();
    const running = await publishedTask();
    await seedPlanOperation(running, "running");
    expect(await rejection(planningCaller(running).planning.retry({ ...planningBase(running), failedOperationId: crypto.randomUUID() }))).toMatchObject({ reason: "operation_active" });
    await closeTaskFixture();
    const review = await publishedTask();
    await seedReview(review);
    expect(await rejection(planningCaller(review).planning.retry({ ...planningBase(review), failedOperationId: crypto.randomUUID() }))).toMatchObject({ reason: "planning_exists" });
  });

  it("IT-064 and IT-085 reject missing configuration and stale versions without work", async () => {
    const setup = await publishedTask();
    expect(await rejection(planningCaller(setup, setup.ownerId, false).planning.start(planningBase(setup)))).toMatchObject({ code: "INTERNAL_SERVER_ERROR", reason: "planning_unconfigured" });
    expect(await rejection(planningCaller(setup).planning.start(planningBase(setup, 6)))).toMatchObject({ code: "CONFLICT", reason: "planning_conflict" });
    expect(await planOperations(setup)).toHaveLength(0);
  });

  it("IT-084 denies a stored receipt after repository authorization is removed", async () => {
    const setup = await publishedTask();
    const input = planningBase(setup);
    await planningCaller(setup).planning.start(input);
    const { githubRepositoryAuthorizations } = await import("../src/infra/database/schema");
    await setup.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, setup.ownerId));
    const outcome = await rejection(planningCaller(setup).planning.submission({ projectId: input.projectId, taskId: input.taskId, requestKey: input.requestKey, action: "planning.start" }));
    expect(outcome).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
  });
});

async function insertActivePlan(setup: Awaited<ReturnType<typeof publishedTask>>, taskId: string) {
  const { taskPublicationAttempts } = await import("../src/infra/database/schema");
  const operationId = crypto.randomUUID();
  const publishId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const draft = { title: "t", context: "c", objective: "o", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
  await setup.database.insert(taskDraftRevisions).values({ id: revisionId, taskId, revisionNumber: 1, canonicalDraft: draft, createdByUserId: setup.ownerId });
  await setup.database.insert(taskOperations).values({ id: publishId, taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 3 });
  await setup.database.insert(taskPublicationAttempts).values({ id: attemptId, taskId, operationId: publishId, revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: "T", bodySnapshot: "B", approvalSessionId: setup.sessionId, outcome: "created", issueId: attemptId, issueNodeId: "I", issueNumber: 1, issueUrl: "https://github.com/acme/private/issues/1", issueCreatedAt: new Date() });
  await setup.database.insert(taskOperations).values({ id: operationId, taskId, kind: "plan", state: "queued", initiatedSessionId: setup.sessionId, baseTaskVersion: 3, publicationAttemptId: attemptId, inputHash: "b".repeat(64) });
  await setup.database.update(tasks).set({ planningStatus: "in_progress", planningOperationId: operationId, activeOperationId: operationId }).where(eq(tasks.id, taskId));
}
