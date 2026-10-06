import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { githubRepositoryAuthorizations, taskDraftRevisions, taskOperations, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, seedPublishedIssue, seedTask, taskFixture } from "./task-api-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); vi.unstubAllEnvs(); });

describe("task history edge cases with PostgreSQL", () => {
  it("IT-136 rejects malformed task identifiers before reading data", async () => {
    const setup = await taskFixture();
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: "bad" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("IT-137 distinguishes an empty history from a search with no matches", async () => {
    const setup = await taskFixture();
    await expect(setup.caller.list({ projectId: setup.project.id, limit: 30 })).resolves.toMatchObject({ items: [], nextCursor: null });
    await seedTask(setup);
    await expect(setup.caller.list({ projectId: setup.project.id, search: "inexistente", limit: 30 })).resolves.toMatchObject({ items: [], nextCursor: null });
  });

  it("UT-009 and IT-138 reach all 31 tasks through keyset pagination", async () => {
    const setup = await taskFixture();
    const rows = Array.from({ length: 31 }, (_, index) => ({ id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: `Task ${index + 1}` }));
    await setup.database.insert(tasks).values(rows);
    const first = await setup.caller.list({ projectId: setup.project.id, limit: 30 });
    const second = await setup.caller.list({ projectId: setup.project.id, limit: 30, cursor: first.nextCursor! });
    expect(first.items).toHaveLength(30);
    expect(second.items).toHaveLength(1);
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(31);
  });

  it("UT-010 rejects a malformed history cursor", async () => {
    const setup = await taskFixture();
    await expect(setup.caller.list({ projectId: setup.project.id, cursor: "!!!", limit: 30 })).rejects.toMatchObject({ cause: { reason: "invalid_cursor" } });
  });

  it("UT-005 and IT-139 and IT-184 withhold task details when a reader lacks a personal credential", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.authorize(setup.readerId);
    await expect(setup.callerFor(setup.readerId).list({ projectId: setup.project.id, limit: 30 })).resolves.toMatchObject({ items: [{ id: setup.taskId, authorUserId: setup.ownerId }] });
    await setup.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, setup.readerId));
    await expect(setup.callerFor(setup.readerId).byId({ projectId: setup.project.id, taskId: setup.taskId })).rejects.toMatchObject({ cause: { reason: "repository_authorization_needed" } });
    await expect(setup.callerFor(setup.readerId).list({ projectId: setup.project.id, limit: 30 })).rejects.toMatchObject({ cause: { reason: "repository_authorization_needed" } });
  });

  it("IT-141 repeated history reads do not create tasks or generation operations", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.caller.list({ projectId: setup.project.id, limit: 30 });
    await setup.caller.list({ projectId: setup.project.id, limit: 30 });
    expect(await setup.database.select().from(tasks)).toHaveLength(1);
    expect(await setup.database.select().from(taskOperations)).toHaveLength(0);
  });

  it("IT-143 and IT-152 restore the confirmed Issue snapshot after publication", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await seedPublishedIssue(setup);
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).resolves.toMatchObject({ task: { status: "published" }, publication: { issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41" } });
  });

  it("IT-145 rejects malformed saved drafts without exposing executable markup", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { canonicalDraft: { title: "<script>alert(1)</script>" } });
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).rejects.toMatchObject({ cause: { reason: "invalid_stored_content" } });
  });

  it("IT-150 reopening an interrupted task does not duplicate messages or operations", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    await setup.database.insert(taskOperations).values({ id: "00000000-0000-4000-8000-000000000072", taskId: setup.taskId, kind: "generate", state: "failed", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, baseRevisionId: setup.revisionId });
    for (let attempt = 0; attempt < 3; attempt++) await setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    expect(await setup.taskDao.messages(setup.taskId, undefined, 30)).toMatchObject({ items: [{ sequence: 1 }, { sequence: 2 }] });
    expect(await setup.database.select().from(taskOperations)).toHaveLength(1);
  });

  it("IT-146 opening an empty intention does not persist a task until submit", async () => {
    const setup = await taskFixture();
    await setup.caller.list({ projectId: setup.project.id, limit: 30 });
    expect(await setup.database.select().from(tasks)).toHaveLength(0);
  });

});
