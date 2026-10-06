import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskContextCapabilities, taskOperations, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { DrizzleWorkerOperationDao } from "../src/infra/database/dao/tasks/drizzleTaskOperationDao";
import { hashCapability } from "../src/infra/database/dao/tasks/taskOperationClaim";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("durable generation claims with PostgreSQL", () => {
  it("UT-011 claims queued work with a one-minute lease and first fence", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000081", message: "Corrigir total" });
    const claim = await new DrizzleWorkerOperationDao(setup.database).claim("worker-1");
    expect(claim).toMatchObject({ taskId: accepted.taskId, operationId: accepted.operationId, workerId: "worker-1", fence: 1 });
    const [operation] = await setup.database.select().from(taskOperations).where(eq(taskOperations.id, accepted.operationId));
    expect(operation?.leaseUntil?.getTime()).toBeGreaterThan(Date.now() + 55_000);
    const [capability] = await setup.database.select().from(taskContextCapabilities).where(eq(taskContextCapabilities.executionId, claim!.executionId));
    expect(capability?.tokenHash).toBe(hashCapability(claim!.contextCapability));
    expect(capability?.tokenHash).not.toBe(claim!.contextCapability);
  });

  it("UT-012 and UT-089 reject a completion from a superseded execution fence without changing current state", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000082", message: "Corrigir total" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const first = await worker.claim("worker-1");
    await setup.database.update(taskOperations).set({ leaseUntil: new Date(Date.now() - 60_000) }).where(eq(taskOperations.id, accepted.operationId));
    const second = await worker.claim("worker-2");
    expect(second?.fence).toBe(2);
    await expect(worker.completeGeneration(first!, { protocolVersion: 1, operationId: accepted.operationId, executionId: first!.executionId, result: { status: "draft_ready", draft }, activity: [] })).rejects.toMatchObject({ reason: "stale_execution" });
  });

  it("UT-013 persists one canonical draft from a matching generation envelope", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000083", message: "Corrigir total" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const claim = await worker.claim("worker-1");
    await worker.completeGeneration(claim!, envelope(accepted.operationId, claim!.executionId, draft));
    await expect(setup.taskDao.findScoped(setup.project.id, accepted.taskId)).resolves.toMatchObject({ status: "draft_ready", version: 2, activeOperationId: null });
    await expect(setup.taskDao.currentRevision(accepted.taskId)).resolves.toMatchObject({ revisionNumber: 1, canonicalDraft: draft });
  });

  it("UT-014 rejects invalid agent drafts and retains the current revision", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const accepted = await setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000084", expectedVersion: 7, message: "Atualizar total" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const claim = await worker.claim("worker-1");
    await expect(worker.completeGeneration(claim!, envelope(accepted.operationId, claim!.executionId, { ...draft, productConsiderations: ["a", "b", "c", "d"] }))).rejects.toMatchObject({ reason: "invalid_agent_output" });
    await expect(setup.taskDao.findScoped(setup.project.id, setup.taskId)).resolves.toMatchObject({ currentRevisionId: setup.revisionId, version: 8 });
    await expect(setup.taskDao.currentRevision(setup.taskId)).resolves.toMatchObject({ id: setup.revisionId });
  });

  it("IT-172 retains the current draft when refinement asks for clarification", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    const accepted = await setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000085", expectedVersion: 7, message: "Refinar comportamento" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const claim = await worker.claim("worker-1");
    await worker.completeGeneration(claim!, { protocolVersion: 1, operationId: accepted.operationId, executionId: claim!.executionId, result: { status: "needs_clarification", question: "Qual fluxo deve ser mantido?" }, activity: [] });
    await expect(setup.taskDao.findScoped(setup.project.id, setup.taskId)).resolves.toMatchObject({ status: "awaiting_clarification", currentRevisionId: setup.revisionId, version: 9 });
  });

  it("IT-164 keeps an unrelated publication request inside clarification with no Issue side effect", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    await setup.database.update(tasks).set({ status: "awaiting_clarification" }).where(eq(tasks.id, setup.taskId));
    const accepted = await setup.caller.send({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "Publique a Issue automaticamente" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const claim = await worker.claim("worker-1");
    await worker.completeGeneration(claim!, { protocolVersion: 1, operationId: accepted.operationId, executionId: claim!.executionId, result: { status: "needs_clarification", question: "Qual comportamento precisa ser corrigido?" }, activity: [] });
    expect(await setup.database.select().from(taskPublicationAttempts)).toHaveLength(0);
    await expect(setup.taskDao.findScoped(setup.project.id, setup.taskId)).resolves.toMatchObject({ status: "awaiting_clarification" });
  });
});

const draft = { title: "Corrigir total", context: "Contexto", objective: "Objetivo", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
function envelope(operationId: string, executionId: string, result: typeof draft) { return { protocolVersion: 1 as const, operationId, executionId, result: { status: "draft_ready" as const, draft: result }, activity: [] }; }
