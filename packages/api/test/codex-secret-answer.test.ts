import { afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { taskTerminalRequests } from "../src/infra/database/schema";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { PostgresSecretAnswerSender } from "../src/infra/database/postgresSecretAnswerSender";
import { requestsOf } from "./session-interaction-support";
import { rejection } from "./planning-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
let clients: postgres.Sql[] = [];
const VALUE = "não registrar este segredo 9f2a";
const QUESTIONS = [{ id: "token", question: "Token de acesso", header: "Token", secret: true, multiSelect: false, options: [{ label: "Informar", description: "" }] }];
afterEach(async () => { await Promise.all(clients.map((client) => client.end())); clients = []; await closeTaskFixture(); await cleanupTerminalFolders(); });
describe("Codex secret answers", () => {
  it("delivers through a separate Postgres listener and stores only the marker", async () => {
    let senderSql!: postgres.Sql;
    const world = await workerWorld({ script: [{ kind: "ask", questions: QUESTIONS }] }, { permissions: undefined }, { secretAnswersFactory: (setup) => { senderSql = postgres(setup.url, { max: 1 }); clients.push(senderSql); return new PostgresSecretAnswerSender(senderSql, 100); } });
    const receiverSql = postgres(world.setup.url, { max: 1 });
    clients.push(receiverSql);
    const worker = world.build({ secretAnswerSql: receiverSql });
    world.worker = worker;
    await worker.startSecretAnswers();
    const sessionId = await world.open();
    await worker.supervisor.tick();
    const runner = world.runtime.runnerOf(sessionId);
    await runner.settled();
    const [request] = await pendingRequest(world, sessionId);
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    await world.harness.caller.session.answerQuestion({ ...scope, requestId: request!.id, answers: { token: { labels: [], other: VALUE } } });
    await runner.settled();
    expect(runner.outcomes).toMatchObject([{ behavior: "allow", updatedInput: { questions: QUESTIONS, answers: { token: VALUE } } }]);
    const stored = await requestsOf(world.setup, sessionId);
    expect(stored[0]!.answer).toMatchObject({ answers: { token: "(resposta oculta)" }, secretDeliveryId: expect.any(String) });
    expect(JSON.stringify(await world.harness.caller.session.timeline({ ...scope, sessionId }))).not.toContain(VALUE);
    expect(JSON.stringify(world.log.entries)).not.toContain(VALUE);
    expect(JSON.stringify(await world.setup.database.select().from(taskTerminalRequests))).not.toContain(VALUE);
    await worker.stopSecretAnswers();
  });
  it("does not accept a secret answer when no worker listener confirms delivery", async () => {
    const world = await workerWorld({ script: [{ kind: "ask", questions: QUESTIONS }] }, { permissions: undefined }, { secretAnswersFactory: (setup) => { const sql = postgres(setup.url, { max: 1 }); clients.push(sql); return new PostgresSecretAnswerSender(sql, 30); } });
    const sessionId = await world.open();
    await cycle(world);
    const [request] = await pendingRequest(world, sessionId);
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    expect(await rejection(world.harness.caller.session.answerQuestion({ ...scope, requestId: request!.id, answers: { token: { labels: [], other: VALUE } } }))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "secret_delivery_failed" });
    expect(await requestsOf(world.setup, sessionId)).toMatchObject([{ id: request!.id, status: "pending", answer: null }]);
  });
  it("rejects delivery after cancellation wins the pending transition", async () => {
    let senderSql!: postgres.Sql;
    const world = await workerWorld({ script: [{ kind: "ask", questions: QUESTIONS }] }, { permissions: undefined }, { secretAnswersFactory: (setup) => { senderSql = postgres(setup.url, { max: 1 }); clients.push(senderSql); return new PostgresSecretAnswerSender(senderSql, 100); } });
    const receiverSql = postgres(world.setup.url, { max: 1 });
    clients.push(receiverSql);
    const worker = world.build({ secretAnswerSql: receiverSql });
    await worker.startSecretAnswers();
    const sessionId = await world.open();
    await worker.supervisor.tick();
    const [request] = await pendingRequest(world, sessionId);
    await new DrizzleSessionRequestDao(world.setup.database).cancelPending(sessionId, new Date());
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    expect(await rejection(world.harness.caller.session.answerQuestion({ ...scope, requestId: request!.id, answers: { token: { labels: [], other: VALUE } } }))).toMatchObject({ code: "CONFLICT", reason: "request_closed" });
    expect(await requestsOf(world.setup, sessionId)).toMatchObject([{ id: request!.id, status: "cancelled", answer: null }]);
    await worker.stopSecretAnswers();
  });
});
async function pendingRequest(world: Awaited<ReturnType<typeof workerWorld>>, sessionId: string) {
  let rows = await requestsOf(world.setup, sessionId);
  for (let attempt = 0; rows.length === 0 && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    rows = await requestsOf(world.setup, sessionId);
  }
  return rows;
}
