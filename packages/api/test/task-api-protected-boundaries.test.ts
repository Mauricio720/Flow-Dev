import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskCaptureLeases, taskDraftRevisions, tasks } from "../src/infra/database/schema";
import { repository } from "./fixture";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";
import { allProtectedCalls, boundaryCaller } from "./task-api-boundary-support";

afterEach(closeTaskFixture);

describe("protected task procedure failures with PostgreSQL", () => {
  it("IT-020 scopes task procedures to the requested project", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const project2 = await setup.createProject({ ...repository, githubId: "303", nodeId: "R_303", name: "other" }, "Other");
    const taskId = "00000000-0000-4000-8000-000000000099";
    await setup.database.insert(tasks).values({ id: taskId, projectId: project2.id, authorUserId: setup.ownerId, repositoryId: "303", repositoryNodeId: "R_303", status: "draft_ready", version: 7 });
    const caller = boundaryCaller(setup, setup.ownerId);
    const base = { projectId: setup.project.id, taskId };
    const results = await Promise.allSettled([
      caller.byId(base), caller.messages({ ...base, limit: 30 }), caller.revisions({ ...base, limit: 30 }),
      caller.send({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "Preservar regra" }),
      caller.retryGeneration({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, failedOperationId: setup.proposalId }),
      caller.saveDraft({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft: { title: "x", context: "x", objective: "x", constraints: [], relevantContext: [], productConsiderations: [], references: [] }, evidenceBindings: [] }),
      caller.resolveRefinement({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, proposalOperationId: setup.proposalId, decision: "discard", selectedPaths: [] }),
      caller.preview({ ...base, revisionId: setup.revisionId }),
      caller.publish({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: "a".repeat(64) }),
      caller.reconcilePublication({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, attemptId: setup.proposalId }),
    ]);
    expectFailure(results, "NOT_FOUND", "task_unavailable");
    expect(await setup.database.select().from(taskDraftRevisions)).toHaveLength(1);
  });

  it("IT-025 blocks start, send, and publish while a capture lease is active", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.database.insert(taskCaptureLeases).values({ userId: setup.ownerId, captureId: crypto.randomUUID(), sessionId: setup.sessionId, projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7, tokenHash: "capture-token-hash", state: "capturing", expiresAt: new Date(Date.now() + 60_000) });
    const caller = boundaryCaller(setup, setup.ownerId);
    const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    const results = await Promise.allSettled([
      caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Nova intenção" }),
      caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "Refinar intenção" }),
      caller.publish({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash }),
    ]);
    expectFailure(results, "CONFLICT", "capture_active");
  });

  it("IT-046 preserves provider rate limits across every protected task procedure", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    setup.githubFetcher.mockImplementation(async () => new Response("", { status: 429, headers: { "retry-after": "60" } }));
    const results = await Promise.allSettled(allProtectedCalls(setup, boundaryCaller(setup, setup.ownerId)));
    expect(results.map((result) => result.status === "rejected" ? [result.reason.code, result.reason.cause?.reason] : "resolved")).toEqual(Array(13).fill(["TOO_MANY_REQUESTS", "provider_rate_limited"]));
    expect(results.every((result) => result.status === "rejected" && result.reason.cause.retryAfterSeconds === 60)).toBe(true);
    expect(await setup.database.select().from(tasks)).toHaveLength(1);
  });
});

function expectFailure(results: PromiseSettledResult<unknown>[], code: string, reason: string) {
  expect(results).toHaveLength(results.length);
  expect(results.every((result) => result.status === "rejected" && result.reason.code === code && result.reason.cause?.reason === reason)).toBe(true);
}
