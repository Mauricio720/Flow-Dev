import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskOperations, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("task command state conflicts with PostgreSQL", () => {
  it("IT-027 rejects a command against an older task version", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 6, message: "Preservar regra fiscal" })).rejects.toMatchObject({ cause: { reason: "revision_conflict" } });
  });

  it("IT-028 blocks a new command while another generation owns the task", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const operationId = "00000000-0000-4000-8000-000000000097";
    await setup.database.insert(taskOperations).values({ id: operationId, taskId: setup.taskId, kind: "generate", state: "queued", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, baseRevisionId: setup.revisionId });
    await setup.database.update(tasks).set({ status: "generating", activeOperationId: operationId }).where(eq(tasks.id, setup.taskId));
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "Outra alteração" })).rejects.toMatchObject({ cause: { reason: "operation_active" } });
  });
});
