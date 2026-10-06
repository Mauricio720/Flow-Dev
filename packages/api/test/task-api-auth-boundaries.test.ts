import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { TaskDao } from "../src/application/database/dao/taskDao";
import { githubRepositoryAuthorizations, tasks, users } from "../src/infra/database/schema";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";
import { allProtectedCalls, boundaryCaller } from "./task-api-boundary-support";

afterEach(closeTaskFixture);

describe("protected task authentication and access with PostgreSQL", () => {
  it("IT-014 requires a session on every protected procedure", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const results = await Promise.allSettled(allProtectedCalls(setup, boundaryCaller(setup, null)));
    expectFailure(results, "UNAUTHORIZED", "session_required");
    expect(await setup.database.select().from(tasks)).toHaveLength(1);
  });

  it("IT-015 hides all task procedures from an unassigned account", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const [outsider] = await setup.database.insert(users).values({ name: "Outsider", email: "outsider@test.invalid" }).returning();
    const results = await Promise.allSettled(allProtectedCalls(setup, boundaryCaller(setup, outsider!.id)));
    expectFailure(results, "NOT_FOUND", "project_unavailable");
  });

  it("IT-016 requires personal private repository authorization on every procedure", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, setup.ownerId));
    const results = await Promise.allSettled(allProtectedCalls(setup, boundaryCaller(setup, setup.ownerId)));
    expectFailure(results, "PRECONDITION_FAILED", "repository_authorization_needed");
  });

  it("IT-017 translates failed scoped database operations to service_unavailable", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const broken = new Proxy(setup.taskDao, { get: () => async () => { throw new Error("database connection interrupted"); } }) as TaskDao;
    const results = await Promise.allSettled(allProtectedCalls(setup, boundaryCaller(setup, setup.ownerId, broken)));
    expectFailure(results, "INTERNAL_SERVER_ERROR", "service_unavailable");
  });

  it("IT-018 prevents a project reader from mutating another author's task", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.authorize(setup.readerId);
    const caller = boundaryCaller(setup, setup.readerId);
    const base = { projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7 };
    const results = await Promise.allSettled([
      caller.send({ ...base, requestKey: crypto.randomUUID(), message: "Preservar regra" }),
      caller.retryGeneration({ ...base, requestKey: crypto.randomUUID(), failedOperationId: setup.proposalId }),
      caller.saveDraft({ ...base, requestKey: crypto.randomUUID(), baseRevisionId: setup.revisionId, draft: { title: "x", context: "x", objective: "x", constraints: [], relevantContext: [], productConsiderations: [], references: [] }, evidenceBindings: [] }),
      caller.resolveRefinement({ ...base, requestKey: crypto.randomUUID(), proposalOperationId: setup.proposalId, decision: "discard", selectedPaths: [] }),
      caller.publish({ ...base, requestKey: crypto.randomUUID(), revisionId: setup.revisionId, repositoryId: "202", previewHash: "a".repeat(64) }),
      caller.reconcilePublication({ ...base, requestKey: crypto.randomUUID(), attemptId: setup.proposalId }),
    ]);
    expectFailure(results, "FORBIDDEN", "author_required");
  });
});

function expectFailure(results: PromiseSettledResult<unknown>[], code: string, reason: string) {
  expect(results.every((result) => result.status === "rejected" && result.reason.code === code && result.reason.cause?.reason === reason)).toBe(true);
}
