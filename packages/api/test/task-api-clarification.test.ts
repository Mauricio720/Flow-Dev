import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskMessages, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, draft, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("clarification replies with PostgreSQL", () => {
  it("IT-023 and IT-165 reject a blank answer while preserving the outstanding question", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    await setup.database.update(tasks).set({ status: "awaiting_clarification" }).where(eq(tasks.id, setup.taskId));
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000086", expectedVersion: 7, message: " \n\t " })).rejects.toMatchObject({ cause: { reason: "blank_message" } });
    await expect(setup.taskDao.messages(setup.taskId, undefined, 30)).resolves.toMatchObject({ items: [{ content: "Corrigir total do carrinho" }, { content: "Qual regra fiscal devo preservar?" }] });
  });

  it("IT-166 rejects an over-budget clarification without truncating its earlier turns", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    await setup.database.update(tasks).set({ status: "awaiting_clarification" }).where(eq(tasks.id, setup.taskId));
    await setup.database.insert(taskMessages).values([3, 4, 5].map((sequence) => ({ taskId: setup.taskId, sequence, role: "user", kind: "clarification", content: "😀".repeat(10_000) })));
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000087", expectedVersion: 7, message: "Preservar tudo" })).rejects.toMatchObject({ cause: { reason: "input_capacity" } });
    expect((await setup.taskDao.messages(setup.taskId, undefined, 30)).items).toHaveLength(5);
  });

  it("IT-198 rejects a blank refinement while preserving the saved revision", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "  " })).rejects.toMatchObject({ cause: { reason: "blank_message" } });
    await expect(setup.taskDao.currentRevision(setup.taskId)).resolves.toMatchObject({ id: setup.revisionId, canonicalDraft: draft });
  });

  it("IT-199 rejects refinement over capacity without losing author edits", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const edited = { ...draft, context: "Texto editado manualmente" };
    const revision = await setup.caller.saveDraft({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft: edited, evidenceBindings: [] });
    await setup.database.insert(taskMessages).values(Array.from({ length: 5 }, (_, index) => ({ taskId: setup.taskId, sequence: index + 1, role: "user" as const, kind: "refinement" as const, content: "😀".repeat(10_000) })));
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 8, message: "Refine o texto" })).rejects.toMatchObject({ cause: { reason: "input_capacity" } });
    await expect(setup.taskDao.currentRevision(setup.taskId)).resolves.toMatchObject({ id: revision.id, canonicalDraft: edited });
  });
});
