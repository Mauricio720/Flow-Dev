import { afterEach, describe, expect, it } from "vitest";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { requestsOf, sessionRowOf } from "./session-interaction-support";
import { cycle, workerWorld, type WorkerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const QUESTIONS = [
  { question: "Quem pode ver os comentários?", header: "Visibilidade", multiSelect: false, options: [{ label: "Só membros (Recomendado)", description: "d1" }, { label: "Qualquer pessoa", description: "d2" }] },
  { question: "Quais verificações rodar?", header: "Verificações", multiSelect: true, options: [{ label: "lint", description: "" }, { label: "test", description: "" }] },
];
const BASH_TEST = { command: "pnpm test", description: "Roda os testes" };
const SUGGESTION = { type: "addRules", behavior: "allow", destination: "session", rules: [{ toolName: "Bash", ruleContent: "pnpm test:*" }] };
const MINUTE_MS = 60_000;

const brokerWorld = (script: ScriptStep[]) => workerWorld({ script }, { permissions: undefined });
const answer = (world: WorkerWorld, requestId: string, value: unknown) => new DrizzleSessionRequestDao(world.setup.database).answerIfPending({ requestId, answer: value, answeredBy: world.setup.ownerId, at: world.clock.now() });

describe("session request broker", () => {
  it("V-24c stores a pending question, moves the session to asking, and hands the answers to the runtime on the next tick", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTIONS }, { kind: "text", text: "Seguindo." }]);
    const id = await world.open();
    await cycle(world);
    const [request] = await requestsOf(world.setup, id);
    expect(request).toMatchObject({ kind: "question", status: "pending", payload: { questions: QUESTIONS } });
    expect((await sessionRowOf(world.setup, id)).status).toBe("asking");
    const answers = { [QUESTIONS[0]!.question]: "Qualquer pessoa", [QUESTIONS[1]!.question]: ["lint", "test"] };
    await answer(world, request!.id, { answers });
    await cycle(world);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([{ behavior: "allow", updatedInput: { questions: QUESTIONS, answers } }]);
    expect((await sessionRowOf(world.setup, id)).status).toBe("running");
  });

  it("V-24d opens an approval with the summary and the suggested rule, and sends allow_always to the local project settings", async () => {
    const world = await brokerWorld([{ kind: "permission", toolName: "Bash", input: BASH_TEST, suggestions: [SUGGESTION] }]);
    const id = await world.open({ permissionMode: "accept_edits" });
    await cycle(world);
    const [request] = await requestsOf(world.setup, id);
    expect(request).toMatchObject({ kind: "permission", status: "pending", toolUseId: "toolu_1", payload: { toolName: "Bash", title: "Rodar comando:", body: "pnpm test\n\nRoda os testes", suggestedRule: "Bash(pnpm test:*)" } });
    await answer(world, request!.id, { decision: "allow_always" });
    await cycle(world);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([{ behavior: "allow", updatedInput: BASH_TEST, updatedPermissions: [{ ...SUGGESTION, destination: "localSettings" }] }]);
  });

  it("V-24d sends a deny with the reason the person gave", async () => {
    const world = await brokerWorld([{ kind: "permission", toolName: "Bash", input: { command: "rm -rf dist" } }]);
    const id = await world.open({ permissionMode: "ask_all" });
    await cycle(world);
    const [request] = await requestsOf(world.setup, id);
    expect(request!.payload).toMatchObject({ suggestedRule: null });
    await answer(world, request!.id, { decision: "deny", reason: "Não apague o build, só rode o lint" });
    await cycle(world);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([{ behavior: "deny", message: "Não apague o build, só rode o lint" }]);
  });

  it("V-24e asks nothing for tools in bypass mode but still asks the questions", async () => {
    const world = await brokerWorld([{ kind: "permission", toolName: "Bash", input: BASH_TEST }, { kind: "text", text: "Segui sem perguntar." }, { kind: "ask", questions: QUESTIONS }]);
    const id = await world.open({ permissionMode: "bypass" });
    await cycle(world);
    expect(world.runtime.runnerOf(id).outcomes[0]).toEqual({ behavior: "allow", updatedInput: BASH_TEST });
    const requests = await requestsOf(world.setup, id);
    expect(requests.map((request) => request.kind)).toEqual(["question"]);
    expect((await sessionRowOf(world.setup, id)).status).toBe("asking");
  });

  it("V-24f keeps the request pending across 50 ticks of the service, with the database as the only state (the deadline-free proof with timers is sessionRequestBroker.test.ts)", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTIONS }]);
    const id = await world.open();
    await cycle(world);
    for (let tick = 0; tick < 50; tick += 1) {
      world.clock.advance((30 * MINUTE_MS) / 50);
      await world.worker.supervisor.tick();
    }
    await world.settle();
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["pending"]);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([]);
    expect((await sessionRowOf(world.setup, id)).status).toBe("asking");
  });

  it("stays asking while one of two requests is still open and returns to running when the last is answered", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTIONS.slice(0, 1) }]);
    const id = await world.open();
    await cycle(world);
    const [first] = await requestsOf(world.setup, id);
    const second = await new DrizzleSessionRequestDao(world.setup.database).insertRequest({ sessionId: id, kind: "question", toolUseId: "toolu_x", payload: { questions: QUESTIONS.slice(0, 1) } });
    await answer(world, first!.id, { answers: { [QUESTIONS[0]!.question]: "Qualquer pessoa" } });
    await cycle(world);
    expect((await sessionRowOf(world.setup, id)).status).toBe("asking");
    await answer(world, second.id, { answers: {} });
    await world.worker.supervisor.tick();
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["answered", "answered"]);
  });
});
