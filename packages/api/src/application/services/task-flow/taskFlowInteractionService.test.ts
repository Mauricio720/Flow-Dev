import { describe, expect, it, vi } from "vitest";
import { TaskFlowInteractionService } from "./taskFlowInteractionService";

const run = { id: "run-1", taskId: "task-1", state: "running", snapshot: { kind: "create_spec" }, runtime: { workspaceId: "ws-1", sessionId: "sess-1" } };
const question = { id: "q-1", providerRequestId: "provider-1", turnId: "turn-1", kind: "question", status: "pending", title: "Qual resultado esperado?", choices: ["A", "B"], decisions: [], toolId: null, resolution: null };

function setup() {
  const find = vi.fn(async () => run);
  const interactions = vi.fn(async () => [question, { ...question, id: "old", status: "answered" }, { ...question, id: "permission", kind: "permission" }]);
  const resolve = vi.fn(async () => ({ outcome: "answered", delivered: true }));
  const service = new TaskFlowInteractionService({ runs: { find } } as never, { interactions, resolve } as never, (runId) => `/runtime/runs/${runId}/daemon.sock`);
  return { service, find, interactions, resolve };
}

describe("TaskFlowInteractionService", () => {
  it("shows only pending questions from the bound run", async () => {
    const { service, interactions } = setup();
    await expect(service.questions("task-1", "run-1")).resolves.toEqual([{ id: "q-1", title: "Qual resultado esperado?", choices: ["A", "B"] }]);
    expect(interactions).toHaveBeenCalledWith({ socketPath: "/runtime/runs/run-1/daemon.sock", workspaceId: "ws-1", sessionId: "sess-1" });
  });

  it("answers the provider request and rejects stale or invalid choices", async () => {
    const { service, resolve } = setup();
    await expect(service.answer("task-1", { runId: "run-1", interactionId: "q-1", choiceIndex: 1 })).resolves.toEqual({ outcome: "answered" });
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ requestId: "provider-1", choiceIndex: 1 }));
    await expect(service.answer("task-1", { runId: "run-1", interactionId: "q-1", choiceIndex: 2 })).rejects.toMatchObject({ reason: "invalid_input" });
    await expect(service.answer("task-1", { runId: "run-1", interactionId: "old", text: "Resposta" })).rejects.toMatchObject({ reason: "interaction_unavailable" });
    await expect(service.questions("other-task", "run-1")).rejects.toMatchObject({ reason: "run_unavailable" });
  });

  it("asks the operator machine instead of a host socket when the run is on the linked local project", async () => {
    const localRun = { ...run, snapshot: { kind: "create_spec", workspace: { kind: "local" } } };
    const interactions = vi.fn();
    const local = { questions: vi.fn(async () => [{ id: "q-9", title: "Qual fila?", choices: [] }]), answer: vi.fn(async () => undefined) };
    const service = new TaskFlowInteractionService({ runs: { find: async () => localRun } } as never, { interactions } as never, () => "/unused", local);
    await expect(service.questions("task-1", "run-1")).resolves.toEqual([{ id: "q-9", title: "Qual fila?", choices: [] }]);
    await expect(service.answer("task-1", { runId: "run-1", interactionId: "q-9", text: "SQS" })).resolves.toEqual({ outcome: "answered" });
    expect(local.answer).toHaveBeenCalledWith(localRun, { interactionId: "q-9", choiceIndex: undefined, text: "SQS" });
    expect(interactions).not.toHaveBeenCalled();
  });
});
