import { describe, expect, it } from "vitest";
import type { QuestionState } from "../../application/services/local-execution/localQuestions";
import { questionChanges } from "./localQuestionReporter";

const ROOT = "/home/dev/projects/shop";
const question = (id: string, overrides: Record<string, unknown> = {}) => ({ id, providerRequestId: `provider-${id}`, turnId: null, kind: "question", status: "pending", title: "Qual banco usar?", choices: ["Postgres"], decisions: [], toolId: null, resolution: null, ...overrides });

function watchOf(interactions: () => Promise<unknown[]>, known = new Map<string, QuestionState>()) {
  const request = { run: { id: "run-1", runtime: { workspaceId: "ws-1", sessionId: "session-1" } } } as never;
  return { launcher: { start: async () => ({ socketPath: "/run/daemon.sock" }), stop: async () => undefined }, gateway: { interactions } as never, request, root: ROOT, known };
}

describe("questionChanges", () => {
  it("reports a question once when it appears and once more when it stops waiting", async () => {
    const waiting = [question("q-1"), question("permission", { kind: "permission" }), question("old", { status: "answered" })];
    let current: unknown[] = waiting;
    const watch = watchOf(async () => current);
    expect(await questionChanges(watch)).toEqual([{ interactionId: "q-1", status: "pending", title: "Qual banco usar?", choices: ["Postgres"] }]);
    expect(await questionChanges(watch)).toEqual([]);
    current = [];
    expect(await questionChanges(watch)).toMatchObject([{ interactionId: "q-1", status: "resolved" }]);
    expect(await questionChanges(watch)).toEqual([]);
  });

  it("hides local paths from the question text and keeps a usable title", async () => {
    const watch = watchOf(async () => [question("q-1", { title: `Posso alterar ${ROOT}/src/db.ts?`, choices: ["Sim", "ver /Users/other/notes"] }), question("q-2", { title: null })]);
    expect(await questionChanges(watch)).toEqual([
      { interactionId: "q-1", status: "pending", title: "Posso alterar [checkout local]/src/db.ts?", choices: ["Sim"] },
      { interactionId: "q-2", status: "pending", title: "O agente precisa de uma resposta", choices: ["Postgres"] },
    ]);
  });

  it("reports nothing when the runtime cannot be reached", async () => {
    const known = new Map<string, QuestionState>([["q-1", "pending"]]);
    expect(await questionChanges(watchOf(async () => { throw new Error("offline"); }, known))).toEqual([]);
    expect(known.get("q-1")).toBe("pending");
  });
});
