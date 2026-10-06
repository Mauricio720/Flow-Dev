import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskOperations, taskDraftRevisions, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, draft, seedTask, storedDraftDefaults, taskFixture } from "./task-api-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); vi.unstubAllEnvs(); });

describe("canonical draft persistence with PostgreSQL", () => {
  it("IT-190 persists all author-edited canonical fields as one immutable revision", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const edited = { ...draft, context: "Preservar a regra fiscal", constraints: ["Não alterar pedidos antigos"], productConsiderations: ["Manter o resumo acessível"] };
    const revision = await setup.caller.saveDraft(saveInput(setup, edited));
    expect(revision).toMatchObject({ revisionNumber: 8, canonicalDraft: edited, parentRevisionId: setup.revisionId });
    await expect(setup.database.update(taskDraftRevisions).set({ canonicalDraft: draft }).where(eq(taskDraftRevisions.id, revision.id))).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("IT-191 keeps empty optional sections valid in the canonical draft", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const revision = await setup.caller.saveDraft(saveInput(setup, draft));
    expect(revision.canonicalDraft).toEqual({ ...draft, ...storedDraftDefaults });
  });

  it("IT-192 rejects a title beyond the canonical input limit", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await expect(setup.caller.saveDraft(saveInput(setup, { ...draft, title: "T".repeat(257) }))).rejects.toMatchObject({ cause: { reason: "input_limit" } });
  });

  it("IT-193 keeps draft mutation author-only even for a project reader", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.authorize(setup.readerId);
    await expect(setup.callerFor(setup.readerId).saveDraft(saveInput(setup, { ...draft, title: "Leitura não altera" }))).rejects.toMatchObject({ cause: { reason: "author_required" } });
  });

  it("IT-195 replays a confirmed save without appending a second revision", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const input = saveInput(setup, { ...draft, title: "Corrigir total revisado" });
    const first = await setup.caller.saveDraft(input);
    await expect(setup.caller.saveDraft(input)).resolves.toEqual(first);
    expect(await setup.database.select().from(taskDraftRevisions)).toHaveLength(2);
  });

  it("IT-196 blocks saving while publication owns the task", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const operationId = "00000000-0000-4000-8000-000000000076";
    await setup.database.insert(taskOperations).values({ id: operationId, taskId: setup.taskId, kind: "publish", state: "running", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, baseRevisionId: setup.revisionId });
    await setup.database.update(tasks).set({ status: "publishing", activeOperationId: operationId }).where(eq(tasks.id, setup.taskId));
    await expect(setup.caller.saveDraft(saveInput(setup, { ...draft, title: "Não publicar edição" }))).rejects.toMatchObject({ cause: { reason: "operation_active" } });
  });
});

function saveInput(setup: Awaited<ReturnType<typeof taskFixture>>, value: typeof draft) {
  return { projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft: value, evidenceBindings: [] };
}
