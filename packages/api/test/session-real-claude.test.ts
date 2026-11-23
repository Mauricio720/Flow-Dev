import { afterEach, describe, expect, it } from "vitest";
import { taskArtifacts, taskTerminalEvents } from "../src/infra/database/schema";
import { killChildProcesses } from "../src/infra/terminal/killChildProcesses";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { closeTaskFixture } from "./task-api-support";
import { REAL_CLAUDE, REAL_TIMEOUT_MS, assistantTexts, drive, realWorld, requestsOf, sessionOf } from "./session-real-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const SPEC_PROMPT = '/flow-dev:spec-writer Escreva a Tech Spec de um botão "Sair" no cabeçalho, em poucas linhas. Antes de escrever, faça as perguntas que precisar com a ferramenta AskUserQuestion. Grave o arquivo com a ferramenta Write (não use Bash) em docs/specs/sair/spec.md e pare para minha revisão.';
const COLOR_PROMPT = 'Use a ferramenta AskUserQuestion para me perguntar "Qual cor?" com as opções "Azul (Recomendado)" e "Verde". Depois que eu responder, escreva "Escolhida: <resposta>" e pare.';

describe.skipIf(!REAL_CLAUDE)("V-31 with the real Claude Code", () => {
  it("V-31a answers the spec-writer questions through the API until the spec becomes an artifact", async () => {
    const world = await realWorld();
    const { sessionId } = await world.harness.caller.terminal.open(openInput(world.setup, { prompt: SPEC_PROMPT, permissionMode: "bypass" }));
    const worker = world.workerFor("worker-real-1");
    let answered = 0;
    const finished = await drive(worker, async () => {
      const [pending] = (await requestsOf(world, sessionId)).filter((request) => request.status === "pending");
      if (pending?.kind === "question") {
        const questions = (pending.payload as { questions: Array<{ question: string; options: Array<{ label: string }> }> }).questions;
        const answers = Object.fromEntries(questions.map((entry) => [entry.question, { labels: [entry.options[0]!.label] }]));
        await world.harness.caller.session.answerQuestion({ projectId: world.setup.project.id, taskId: world.setup.taskId, requestId: pending.id, answers });
        answered += 1;
      }
      const artifacts = await world.setup.database.select().from(taskArtifacts);
      return (await sessionOf(world, sessionId)).status === "waiting" && artifacts.some((artifact) => artifact.relativePath === "docs/specs/sair/spec.md");
    });
    const events = await world.setup.database.select().from(taskTerminalEvents);
    await worker.registry.abandonAll();
    const recorded = events.map((event) => `${event.kind}:${event.summary.slice(0, 60)}`).join(" | ");
    expect(finished, `o artefato não apareceu; eventos gravados: ${recorded}`).toBe(true);
    expect(answered).toBeGreaterThan(0);
  }, REAL_TIMEOUT_MS + 60_000);

  it("V-31c resumes the same Claude conversation after the service restarts with a pending question", async () => {
    const world = await realWorld();
    const { sessionId } = await world.harness.caller.terminal.open(openInput(world.setup, { prompt: COLOR_PROMPT, permissionMode: "bypass" }));
    const first = world.workerFor("worker-real-1");
    expect(await drive(first, async () => (await requestsOf(world, sessionId)).some((request) => request.status === "pending"))).toBe(true);
    await killChildProcesses();
    const second = world.workerFor("worker-real-2");
    expect(await drive(second, async () => (await sessionOf(world, sessionId)).status === "interrupted", 30_000)).toBe(true);
    expect((await requestsOf(world, sessionId)).map((request) => request.status)).toEqual(["cancelled"]);
    await world.harness.caller.session.send({ ...world.scope(sessionId), content: "Pode seguir com a opção recomendada", requestKey: crypto.randomUUID() });
    const answered = await drive(second, async () => (await assistantTexts(world, sessionId)).some((text) => /azul/i.test(text)));
    await second.registry.abandonAll();
    expect(answered).toBe(true);
    expect(await sessionOf(world, sessionId)).toMatchObject({ claudeSessionId: expect.any(String) });
  }, REAL_TIMEOUT_MS + 60_000);

  it("REQ-076 keeps the session retomável when the service is stopped normally with a pending question", async () => {
    const world = await realWorld();
    const { sessionId } = await world.harness.caller.terminal.open(openInput(world.setup, { prompt: COLOR_PROMPT, permissionMode: "bypass" }));
    const first = world.workerFor("worker-real-1");
    expect(await drive(first, async () => (await requestsOf(world, sessionId)).some((request) => request.status === "pending"))).toBe(true);
    const stop = new AbortController();
    stop.abort();
    await first.run(stop.signal);
    expect(await sessionOf(world, sessionId)).toMatchObject({ status: "asking", endedAt: null });
    const second = world.workerFor("worker-real-2");
    expect(await drive(second, async () => (await sessionOf(world, sessionId)).status === "interrupted", 30_000)).toBe(true);
    expect((await requestsOf(world, sessionId)).map((request) => request.status)).toEqual(["cancelled"]);
  }, REAL_TIMEOUT_MS + 60_000);
});
