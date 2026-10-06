import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskMessages, taskOperations } from "../src/infra/database/schema";
import { closeTaskFixture, draft, seedTask, storedDraftDefaults, taskFixture } from "./task-api-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); vi.unstubAllEnvs(); });

describe("protected durable task procedures with PostgreSQL", () => {
  it("IT-001/002/003/004 exercise list, detail, messages, and immutable revisions", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true, previousRevision: true });
    await expect(setup.caller.list({ projectId: setup.project.id, limit: 30 })).resolves.toMatchObject({ items: [{ id: setup.taskId, authorUserId: setup.ownerId }], nextCursor: null });
    await expect(setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).resolves.toMatchObject({ currentRevision: { id: setup.revisionId }, permissions: { canEdit: true } });
    await expect(setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30 })).resolves.toMatchObject({ items: [{ content: "Corrigir total do carrinho" }, { content: "Qual regra fiscal devo preservar?" }] });
    const revisions = await setup.caller.revisions({ projectId: setup.project.id, taskId: setup.taskId, limit: 1 });
    expect(revisions.nextCursor).toBeTruthy();
    const next = await setup.caller.revisions({ projectId: setup.project.id, taskId: setup.taskId, limit: 1, cursor: revisions.nextCursor! });
    expect(next.items).toMatchObject([{ id: setup.revisionId, revisionNumber: 7, parentRevisionId: setup.previousRevisionId }]);
  });

  it("UT-007 and IT-005 accept one start receipt and record the original user turn", async () => {
    const setup = await taskFixture();
    const receipt = await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000051", message: "Corrigir total do carrinho" });
    expect(receipt).toMatchObject({ version: 1, taskId: expect.any(String), operationId: expect.any(String), acceptedMessageId: expect.any(String) });
    await expect(setup.caller.submission({ projectId: setup.project.id, action: "start", requestKey: "00000000-0000-4000-8000-000000000051" })).resolves.toEqual(receipt);
  });

  it("IT-006 and IT-007 accept one refinement and recover its receipt", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const receipt = await setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000052", expectedVersion: 7, message: "Preservar regra fiscal" });
    expect(receipt).toMatchObject({ taskId: setup.taskId, version: 8 });
    await expect(setup.caller.submission({ projectId: setup.project.id, action: "send", requestKey: "00000000-0000-4000-8000-000000000052" })).resolves.toEqual(receipt);
    await expect(setup.caller.submission({ projectId: setup.project.id, action: "send", requestKey: "00000000-0000-4000-8000-000000000053" })).resolves.toMatchObject({ status: "not_accepted" });
  });

  it("IT-156 rejects an oversized complete history without accepting or truncating the turn", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await setup.database.insert(taskMessages).values(Array.from({ length: 3 }, (_, index) => ({ taskId: setup.taskId, sequence: index + 1, role: "user", kind: "refinement", content: "😀".repeat(10_000) })));
    await expect(setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000057", expectedVersion: 7, message: "Preservar tudo" })).rejects.toMatchObject({ cause: { reason: "input_capacity" } });
    expect(await setup.taskDao.findScoped(setup.project.id, setup.taskId)).toMatchObject({ version: 7, status: "draft_ready", activeOperationId: null });
    expect((await setup.taskDao.messages(setup.taskId, undefined, 30)).items).toHaveLength(3);
  });

  it("IT-008 retries a failed generation using the accepted user turn", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const operationId = "00000000-0000-4000-8000-000000000061";
    await setup.database.insert(taskOperations).values({ id: operationId, taskId: setup.taskId, kind: "generate", state: "failed", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, baseRevisionId: setup.revisionId });
    await setup.database.insert(taskMessages).values({ id: "00000000-0000-4000-8000-000000000062", taskId: setup.taskId, operationId, sequence: 1, role: "user", kind: "intent", content: "Corrigir total do carrinho" });
    await setup.database.update(taskOperations).set({ inputMessageId: "00000000-0000-4000-8000-000000000062" }).where(eq(taskOperations.id, operationId));
    const receipt = await setup.caller.retryGeneration({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000054", expectedVersion: 7, failedOperationId: operationId });
    expect(receipt).toMatchObject({ taskId: setup.taskId, acceptedMessageId: "00000000-0000-4000-8000-000000000062", version: 8 });
  });

  it("IT-009 saves a new immutable revision through the protected router", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const revision = await setup.caller.saveDraft({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000055", expectedVersion: 7, baseRevisionId: setup.revisionId, draft: { ...draft, title: "Corrigir total fiscal" }, evidenceBindings: [] });
    expect(revision).toMatchObject({ taskId: setup.taskId, revisionNumber: 8, parentRevisionId: setup.revisionId, canonicalDraft: { title: "Corrigir total fiscal" } });
    expect(await setup.taskDao.findScoped(setup.project.id, setup.taskId)).toMatchObject({ currentRevisionId: revision.id, version: 8 });
  });

  it("IT-010 applies only selected fields from a pending refinement proposal", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { proposal: true });
    const result = await setup.caller.resolveRefinement({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000056", expectedVersion: 7, proposalOperationId: setup.proposalId, decision: "apply", selectedPaths: ["title"] });
    expect(result.revision?.canonicalDraft).toEqual({ ...draft, ...storedDraftDefaults, title: "Título proposto" });
    expect(await setup.taskDao.findScoped(setup.project.id, setup.taskId)).toMatchObject({ currentRevisionId: result.revision?.id, version: 8, pendingProposalOperationId: null });
  });

});
