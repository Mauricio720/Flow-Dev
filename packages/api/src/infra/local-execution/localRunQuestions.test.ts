import { describe, expect, it, vi } from "vitest";
import { LocalRunQuestions } from "./localRunQuestions";
import { deterministicLocalRequestKey } from "./requestKey";

const START_COMMAND = "start-command";
const target = { machineId: "machine-1", linkId: "link-1", linkRevision: 2, checkoutHandle: "checkout-1" };
const run = { id: "run-1", taskId: "task-1", leaseFence: 7, runtime: { sessionId: START_COMMAND, workspaceId: "local:machine-1" }, snapshot: { kind: "create_spec", operatorId: "operator-1", workspace: { kind: "local", target } } } as never;
const asked = { sequence: 3, kind: "question", payloadHash: "hash", payload: { interactionId: "q-1", status: "pending", title: "Qual banco usar?", choices: ["Postgres", "SQLite"] } };
const answerKey = (operation: string) => deterministicLocalRequestKey("run-1:q-1", operation);

function setup(commands: Record<string, { events: { kind: string }[] }> = {}) {
  const records: Record<string, unknown> = { [START_COMMAND]: { command: {}, events: [asked] }, ...commands };
  const commandForActor = vi.fn(async ({ commandId }: { commandId: string }) => records[commandId] ?? null);
  const enqueueCommand = vi.fn(async (input: Record<string, unknown>) => input as never);
  const questions = new LocalRunQuestions({ local: { commandForActor, enqueueCommand } as never, flow: { taskContext: async () => ({ projectId: "project-1" }) } as never });
  return { questions, enqueueCommand };
}

describe("LocalRunQuestions", () => {
  it("lists what the connector reported and sends the chosen answer to the operator machine", async () => {
    const { questions, enqueueCommand } = setup();
    expect(await questions.questions(run)).toEqual([{ id: "q-1", title: "Qual banco usar?", choices: ["Postgres", "SQLite"] }]);
    await questions.answer(run, { interactionId: "q-1", choiceIndex: 1 });
    expect(enqueueCommand).toHaveBeenCalledWith(expect.objectContaining({ id: answerKey("answer"), kind: "answer", runId: "run-1", machineId: "machine-1", actorId: "operator-1", projectId: "project-1", target, payload: { interactionId: "q-1", answer: "SQLite" } }));
  });

  it("asks nothing once the run reported its end", async () => {
    const { questions } = setup({ [START_COMMAND]: { events: [asked, { kind: "terminal" }] } });
    expect(await questions.questions(run)).toEqual([]);
    await expect(questions.answer(run, { interactionId: "q-1", choiceIndex: 0 })).rejects.toMatchObject({ reason: "interaction_unavailable" });
  });

  it("hides a question whose answer is on its way and refuses a second answer", async () => {
    const { questions, enqueueCommand } = setup({ [answerKey("answer")]: { events: [] } });
    expect(await questions.questions(run)).toEqual([]);
    await expect(questions.answer(run, { interactionId: "q-1", text: "Postgres" })).rejects.toMatchObject({ reason: "interaction_unavailable" });
    expect(enqueueCommand).not.toHaveBeenCalled();
  });

  it("offers the question again when the connector could not deliver the first answer", async () => {
    const { questions, enqueueCommand } = setup({ [answerKey("answer")]: { events: [{ kind: "terminal" }] } });
    expect(await questions.questions(run)).toHaveLength(1);
    await questions.answer(run, { interactionId: "q-1", text: "Postgres" });
    expect(enqueueCommand).toHaveBeenCalledWith(expect.objectContaining({ id: answerKey("answer-retry"), payload: { interactionId: "q-1", answer: "Postgres" } }));
  });

  it("rejects an unknown question and an out-of-range choice", async () => {
    const { questions } = setup();
    await expect(questions.answer(run, { interactionId: "missing", text: "x" })).rejects.toMatchObject({ reason: "interaction_unavailable" });
    await expect(questions.answer(run, { interactionId: "q-1", choiceIndex: 5 })).rejects.toMatchObject({ reason: "invalid_input" });
  });
});
