import { afterEach, describe, expect, it } from "vitest";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { requestsOf, sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, messagesOf } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const QUESTION = [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "a" }] }];
const stopped = () => {
  const abort = new AbortController();
  abort.abort();
  return abort.signal;
};

describe("stopping the sessions service", () => {
  it("REQ-076 leaves a running session and one waiting for an answer active, with no end or end note", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTION }]);
    const waiting = await world.open();
    const idle = await world.open();
    await cycle(world);
    await world.worker.run(stopped());
    expect(world.runtime.runnerOf(waiting).closed).toBe(true);
    for (const id of [waiting, idle]) expect(await sessionRowOf(world.setup, id)).toMatchObject({ endedAt: null, endReason: null });
    expect((await sessionRowOf(world.setup, waiting)).status).toBe("asking");
    expect((await requestsOf(world.setup, waiting)).map((request) => request.status)).toEqual(["pending"]);
  });

  it("US-10.1 lets the next service mark them interrupted, cancel the pending question and write the note", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTION }]);
    const id = await world.open();
    await cycle(world);
    await world.worker.run(stopped());
    const next = world.build({ runtime: new ScriptedSessionRuntime(), workerId: "worker-2" });
    await next.supervisor.tick();
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "interrupted", endedAt: null });
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["cancelled"]);
    expect((await messagesOf(world, id)).filter((message) => message.role === "system").map((message) => message.content)).toEqual(["Sessão interrompida às 14:32. Envie uma mensagem para retomar."]);
  });
});
