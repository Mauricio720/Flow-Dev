import { describe, expect, it, vi } from "vitest";
import { TaskWorkerController } from "./taskWorkerController";

const claim = { taskId: "task", operationId: "operation", executionId: "execution", fence: 1, workerId: "00000000-0000-4000-8000-000000000001" as const, sessionId: "session", contextCapability: "opaque-capability" };
const input = { protocolVersion: 1 as const, operationId: claim.operationId, executionId: claim.executionId, messages: [{ role: "user" as const, content: "Corrigir total" }], currentDraft: null, baseRevisionId: null, retainedEvidence: [], contextCapability: claim.contextCapability };
const result = { protocolVersion: 1 as const, operationId: claim.operationId, executionId: claim.executionId, result: { status: "needs_clarification" as const, question: "Qual erro acontece?" }, activity: [] };

describe("durable task worker", () => {
  it("UT-035 sends a claimed execution to the Issue Author and settles its envelope", async () => {
    const operations = { claim: vi.fn().mockResolvedValue(claim), generationInput: vi.fn().mockResolvedValue(input), completeGeneration: vi.fn(), failGeneration: vi.fn(), heartbeat: vi.fn() };
    const author = { generate: vi.fn().mockResolvedValue(result) };
    const worker = new TaskWorkerController(operations as never, author as never, claim.workerId);
    await expect(worker.tick()).resolves.toBe(true);
    expect(author.generate).toHaveBeenCalledWith(input);
    expect(operations.completeGeneration).toHaveBeenCalledWith(claim, result);
    expect(operations.failGeneration).not.toHaveBeenCalled();
  });
  it("keeps the priority points chosen by the author when a draft is regenerated", async () => {
    const generated = { title: "Corrigir total", context: "Total antigo", objective: "Recalcular", constraints: [], relevantContext: [], productConsiderations: [], references: [], priorityPoints: null };
    const refinement = { ...input, currentDraft: { ...generated, priorityPoints: 4 } };
    const operations = { claim: vi.fn().mockResolvedValue(claim), generationInput: vi.fn().mockResolvedValue(refinement), completeGeneration: vi.fn(), failGeneration: vi.fn(), heartbeat: vi.fn() };
    const author = { generate: vi.fn().mockResolvedValue({ ...result, result: { status: "draft_ready" as const, draft: generated } }) };
    await new TaskWorkerController(operations as never, author as never, claim.workerId).tick();
    expect(operations.completeGeneration).toHaveBeenCalledWith(claim, expect.objectContaining({ result: { status: "draft_ready", draft: { ...generated, priorityPoints: 4, labels: ["generica"] } } }));
  });
});
