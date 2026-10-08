import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TasksController } from "../src/controllers/tasksController";
import { DrizzleTaskDao } from "../src/infra/database/dao/tasks/drizzleTaskDao";
import { createTasksRouter } from "../src/routers/tasks";
import { assignedFixture, closeAssigned, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

describe("imported tasks stay out of the authoring surface", () => {
  it("does not list or open an imported task through the authoring procedures", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    const authoring = createTasksRouter(new TasksController(new DrizzleTaskDao(f.database), f.repositories)).createCaller({ principal: { userId: f.u1.id, sessionId: crypto.randomUUID() }, requestId: "authoring", responseHeaders: undefined });
    expect((await authoring.list({ projectId: f.project.id, limit: 30 })).items).toHaveLength(0);
    expect(await rejection(authoring.byId({ projectId: f.project.id, taskId }))).toMatchObject({ code: "NOT_FOUND", reason: "task_unavailable" });
  });
});
