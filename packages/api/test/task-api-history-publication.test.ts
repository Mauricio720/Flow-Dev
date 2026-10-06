import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { githubRepositoryAuthorizations, taskOperations, taskPublicationAttempts, taskToolActivity, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, draft, seedPublishedIssue, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("task history publication snapshots with PostgreSQL", () => {
  it("IT-227 rejects an unsafe stored Issue link", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await seedPublishedIssue(setup, "https://evil.example/acme/private/issues/41");
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).rejects.toMatchObject({ cause: { reason: "invalid_stored_content" } });
  });

  it("IT-229 and IT-232 and IT-234 reopen the historical Issue snapshot without dispatch", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await seedPublishedIssue(setup);
    const read = () => setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    const reads = await Promise.all([read(), read(), read()]);
    expect(reads.map((entry) => entry.publication)).toEqual(Array(3).fill(reads[0]!.publication));
    expect(reads[0]?.publication).toMatchObject({ issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", title: draft.title });
    expect(await setup.database.select().from(taskPublicationAttempts)).toHaveLength(1);
  });

  it("IT-228 does not show a publication success without a verified receipt", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.database.update(tasks).set({ status: "publication_uncertain" }).where(eq(tasks.id, setup.taskId));
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).resolves.toMatchObject({ task: { status: "publication_uncertain" }, publication: null });
  });

  it("IT-230 protects the confirmed result after personal repository access is revoked", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await seedPublishedIssue(setup);
    await setup.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, setup.ownerId));
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).rejects.toMatchObject({ cause: { reason: "repository_authorization_needed" } });
  });

  it("IT-186 returns persisted consultation activity unchanged on repeated reads", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const operationId = "00000000-0000-4000-8000-000000000077";
    const executionId = "00000000-0000-4000-8000-000000000078";
    await setup.database.insert(taskOperations).values({ id: operationId, taskId: setup.taskId, kind: "generate", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, baseRevisionId: setup.revisionId, executionId });
    await setup.database.insert(taskToolActivity).values({ taskId: setup.taskId, operationId, executionId, toolCallId: "lookup-1", tool: "searchProject", target: "src/cart.ts", status: "done", reason: null, durationMs: 12, evidenceIds: [], sequence: 1 });
    const read = () => setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    const reads = await Promise.all([read(), read(), read()]);
    expect(reads.map((entry) => entry.activity)).toEqual(Array(3).fill(reads[0]!.activity));
    expect(await setup.database.select().from(taskToolActivity)).toHaveLength(1);
  });
});
