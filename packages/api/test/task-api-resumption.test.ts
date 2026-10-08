import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { adminDesignations, projectAssignments, taskDraftRevisions, taskMessages } from "../src/infra/database/schema";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); vi.unstubAllEnvs(); });

describe("task resumption data with PostgreSQL", () => {
  it("IT-147 pages all 61 messages in order without repeating records", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.database.insert(taskMessages).values(Array.from({ length: 61 }, (_, index) => ({ taskId: setup.taskId, sequence: index + 1, role: "user", kind: "refinement", content: `Turn ${index + 1}` })));
    const first = await setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30 });
    const second = await setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30, cursor: first.nextCursor! });
    const third = await setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30, cursor: second.nextCursor! });
    const items = [...first.items, ...second.items, ...third.items];
    expect(items).toHaveLength(61);
    expect(items.map((item) => item.sequence)).toEqual(Array.from({ length: 61 }, (_, index) => index + 1));
  });

  it("IT-148 hides saved content after the author's project assignment is revoked", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    await setup.database.delete(projectAssignments).where(eq(projectAssignments.userId, setup.ownerId));
    await setup.database.delete(adminDesignations).where(eq(adminDesignations.githubUserId, "88"));
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).rejects.toMatchObject({ cause: { reason: "project_unavailable" } });
    await expect(setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30 })).rejects.toMatchObject({ cause: { reason: "project_unavailable" } });
  });
});
