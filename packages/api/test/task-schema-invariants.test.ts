import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskDraftRevisions, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, draft, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("task revision binding invariants with PostgreSQL", () => {
  it("UT-067 accepts a current revision bound to its task", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await expect(setup.taskDao.findScoped(setup.project.id, setup.taskId)).resolves.toMatchObject({ currentRevisionId: setup.revisionId });
  });

  it("UT-068 rejects a current revision owned by another task", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const foreignTaskId = "00000000-0000-4000-8000-000000000073";
    const foreignRevisionId = "00000000-0000-4000-8000-000000000074";
    await setup.database.insert(tasks).values({ id: foreignTaskId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: "Outra tarefa" });
    await setup.database.insert(taskDraftRevisions).values({ id: foreignRevisionId, taskId: foreignTaskId, revisionNumber: 1, canonicalDraft: draft, createdByUserId: setup.ownerId });
    await expect(setup.database.update(tasks).set({ currentRevisionId: foreignRevisionId }).where(eq(tasks.id, setup.taskId))).rejects.toMatchObject({ cause: { code: "23503", constraint_name: "tasks_current_revision_same_task_fk" } });
    await expect(setup.taskDao.findScoped(setup.project.id, setup.taskId)).resolves.toMatchObject({ currentRevisionId: setup.revisionId });
  });
});
