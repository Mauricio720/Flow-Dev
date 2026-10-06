import { afterEach, describe, expect, it } from "vitest";
import { closeTaskFixture, draft, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("task procedure input boundaries with PostgreSQL", () => {
  it("IT-019 rejects malformed project IDs across all protected procedures", async () => {
    const setup = await taskFixture();
    const bad = "bad";
    const calls = [
      setup.caller.list({ projectId: bad, limit: 30 }), setup.caller.byId({ projectId: bad, taskId: setup.taskId }),
      setup.caller.messages({ projectId: bad, taskId: setup.taskId, limit: 30 }), setup.caller.revisions({ projectId: bad, taskId: setup.taskId, limit: 30 }),
      setup.caller.start({ projectId: bad, requestKey: crypto.randomUUID(), message: "Corrigir total" }), setup.caller.send({ projectId: bad, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "Atualizar total" }),
      setup.caller.submission({ projectId: bad, action: "send", requestKey: crypto.randomUUID() }), setup.caller.retryGeneration({ projectId: bad, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, failedOperationId: setup.proposalId }),
      setup.caller.saveDraft({ projectId: bad, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft, evidenceBindings: [] }),
      setup.caller.resolveRefinement({ projectId: bad, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, proposalOperationId: setup.proposalId, decision: "discard", selectedPaths: [] }),
      setup.caller.preview({ projectId: bad, taskId: setup.taskId, revisionId: setup.revisionId }), setup.caller.publish({ projectId: bad, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: "a".repeat(64) }),
      setup.caller.reconcilePublication({ projectId: bad, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, attemptId: setup.proposalId }),
    ];
    const results = await Promise.allSettled(calls);
    expect(results.every((result) => result.status === "rejected" && result.reason.code === "BAD_REQUEST")).toBe(true);
  });

  it("IT-021 rejects malformed cursors for tasks, messages, and revisions", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const calls = [setup.caller.list({ projectId: setup.project.id, limit: 30, cursor: "!!!" }), setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30, cursor: "!!!" }), setup.caller.revisions({ projectId: setup.project.id, taskId: setup.taskId, limit: 30, cursor: "!!!" })];
    const results = await Promise.allSettled(calls);
    expect(results.every((result) => result.status === "rejected" && result.reason.cause?.reason === "invalid_cursor")).toBe(true);
  });

  it("IT-022 returns input_limit for overlong search, start, send, and draft title", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const calls = [setup.caller.list({ projectId: setup.project.id, search: "a".repeat(201), limit: 30 }), setup.caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "a".repeat(10_001) }), setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "a".repeat(10_001) }), setup.caller.saveDraft({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft: { ...draft, title: "a".repeat(257) }, evidenceBindings: [] })];
    const results = await Promise.allSettled(calls);
    expect(results.every((result) => result.status === "rejected" && result.reason.cause?.reason === "input_limit")).toBe(true);
  });

  it("IT-044 reports invalid_request_key for malformed submission receipts", async () => {
    const setup = await taskFixture();
    await expect(setup.caller.submission({ projectId: setup.project.id, action: "send", requestKey: "not-a-uuid" })).rejects.toMatchObject({ code: "BAD_REQUEST", cause: { issues: [{ path: ["requestKey"] }] } });
  });
});
