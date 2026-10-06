import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSpecAttempts, taskSpecCommands, taskSpecInteractions, taskSpecStages } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { httpProcedure } from "./spec-calls";
import { rejection, specCaller, specScope, specTask } from "./spec-support";
import { seedInteraction, setAttemptState, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

async function waiting(options = {}) {
  const setup = await specTask();
  const started = await startWorkflow(setup);
  const question = await seedInteraction(setup, started, options);
  const answer = (response: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({ ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: 1, attemptId: started.attemptId, interactionId: question.id, response, ...overrides });
  return { setup, started, question, answer, caller: specCaller(setup) };
}
type Setup = Awaited<ReturnType<typeof waiting>>["setup"];
const stored = async (setup: Setup) => (await setup.database.select().from(taskSpecInteractions))[0]!;

describe("taskSpec.answer", () => {
  it("IT-160 accepts the author's text with delivery pending", async () => {
    const { setup, caller, answer } = await waiting();
    const receipt = await caller.answer(answer({ text: "Thirty days" }) as never);
    expect(receipt).toMatchObject({ status: "accepted", specVersion: 2 });
    expect(await stored(setup)).toMatchObject({ status: "resolved", delivery: "pending", winningCommandId: receipt.commandId, response: { value: "Thirty days", text: "Thirty days" } });
  });
  it("UT-009 stores the exact offered choice for an explicit index", async () => {
    const { setup, caller, answer } = await waiting();
    await caller.answer(answer({ choiceIndex: 0 }) as never);
    expect((await stored(setup)).response).toMatchObject({ value: "Thirty days", choiceIndex: 0 });
  });
  it("IT-031, IT-032, IT-189 reject invalid responses and keep the question pending", async () => {
    const { setup, caller, answer } = await waiting();
    for (const response of [{ choiceIndex: 2 }, { text: "   " }, {}, { choiceIndex: 0, text: "x" }]) {
      const result = await rejection(caller.answer(answer(response) as never));
      expect(result?.code === "BAD_REQUEST" || result?.reason === "invalid_answer").toBe(true);
    }
    expect(await httpProcedure(setup, "answer", answer({ choiceIndex: 2 }))).toEqual({ status: 400, reason: "invalid_answer" });
    expect(await httpProcedure(setup, "answer", answer({ text: "  " }))).toEqual({ status: 400, reason: "invalid_answer" });
    expect((await stored(setup)).status).toBe("pending");
  });
  it("IT-033 rejects 16,385 bytes with invalid_input without resolving", async () => {
    const { setup, answer } = await waiting();
    expect(await httpProcedure(setup, "answer", answer({ text: "a".repeat(16_385) }))).toEqual({ status: 400, reason: "invalid_input" });
    expect((await stored(setup)).status).toBe("pending");
  });
  it("IT-034 and IT-172 refuse a nonauthor administrator", async () => {
    const { setup, answer } = await waiting();
    await setup.authorize(setup.readerId);
    expect(await rejection(specCaller(setup, setup.readerId).answer(answer({ text: "x" }) as never))).toMatchObject({ code: "FORBIDDEN", reason: "author_required" });
    expect((await stored(setup)).status).toBe("pending");
  });
  it("IT-035 and IT-193 arbitrate two tabs into one immutable winner", async () => {
    const { setup, caller, answer } = await waiting();
    const results = await Promise.allSettled([caller.answer(answer({ text: "Thirty days" }) as never), caller.answer(answer({ text: "Ninety days" }) as never)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const winner = await stored(setup);
    const late = await rejection(caller.answer(answer({ text: "Ninety days" }, { expectedSpecVersion: 2 }) as never));
    expect(late).toMatchObject({ code: "CONFLICT", reason: "interaction_resolved" });
    expect(await stored(setup)).toMatchObject({ winningCommandId: winner.winningCommandId, response: winner.response });
    expect(await setup.database.select().from(taskSpecCommands).where(eq(taskSpecCommands.action, "spec.answer"))).toHaveLength(1);
  });
  it("IT-037 replays an accepted answer without touching another question", async () => {
    const { setup, started, caller, answer } = await waiting();
    const other = await seedInteraction(setup, started, { attemptState: "waiting" });
    const input = answer({ text: "Thirty days" });
    const first = await caller.answer(input as never);
    expect(await caller.answer(input as never)).toEqual(first);
    expect((await setup.database.select().from(taskSpecInteractions).where(eq(taskSpecInteractions.id, other.id)))[0]).toMatchObject({ status: "pending", winningCommandId: null });
  });
  it("IT-038 and IT-192 report stale attempts and stale turns as interaction_stale", async () => {
    const { setup, started, caller, answer } = await waiting();
    await setAttemptState(setup, started, "waiting", "turn-2");
    expect(await rejection(caller.answer(answer({ text: "x" }) as never))).toMatchObject({ code: "CONFLICT", reason: "interaction_stale" });
    await setAttemptState(setup, started, "waiting", "turn-1");
    const workflowId = started.workflowId;
    await setup.database.insert(taskSpecAttempts).values({ workflowId, stage: "prd", attemptNumber: 2, kind: "retry", sourceAttemptId: started.attemptId, input: {}, inputHash: "b".repeat(64), state: "failed" });
    await setup.database.update(taskSpecAttempts).set({ state: "failed" }).where(eq(taskSpecAttempts.id, started.attemptId));
    const [next] = await setup.database.select().from(taskSpecAttempts).where(eq(taskSpecAttempts.attemptNumber, 2));
    await setup.database.update(taskSpecStages).set({ currentAttemptId: next!.id }).where(eq(taskSpecStages.workflowId, workflowId));
    expect(await rejection(caller.answer(answer({ text: "x" }) as never))).toMatchObject({ code: "CONFLICT", reason: "interaction_stale" });
  });
  it("IT-210 refuses to answer a question whose title was lost to redaction", async () => {
    const { setup, answer } = await waiting({ status: "blocked", description: "" });
    expect(await rejection(specCaller(setup).answer(answer({ text: "x" }) as never))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_answer" });
  });
  it("IT-048 hides an interaction from another work item", async () => {
    const { setup, answer } = await waiting();
    expect(await rejection(specCaller(setup).answer(answer({ text: "x" }, { interactionId: crypto.randomUUID() }) as never))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
  });
});
