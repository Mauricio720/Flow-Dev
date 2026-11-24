import { afterEach, describe, expect, it } from "vitest";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { requestsOf, sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, messagesOf, restartedWorker, type WorkerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const QUESTION = [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "a" }] }];
const RESTART_NOTE = "Sessão interrompida às 14:32. Envie uma mensagem para retomar.";

const systemNotes = async (world: WorkerWorld, sessionId: string) => (await messagesOf(world, sessionId)).filter((message) => message.role === "system").map((message) => message.content);

describe("session recovery after a restart", () => {
  it("V-26a marks the sessions of the previous worker as interrupted with the note, cancelling their pending requests", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTION }]);
    const id = await world.open();
    await cycle(world);
    expect((await sessionRowOf(world.setup, id)).status).toBe("asking");
    const next = await restartedWorker(world);
    await next.worker.supervisor.tick();
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "interrupted", workerId: "worker-1" });
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["cancelled"]);
    expect(await systemNotes(world, id)).toEqual([RESTART_NOTE]);
    expect(next.runtime.resumes).toHaveLength(0);
  });

  it("V-26a leaves the sessions of the own worker, the ended ones and the other hosts alone", async () => {
    const world = await brokerWorld([]);
    const own = await world.open();
    const foreign = await world.open();
    await world.setup.client`update task_terminal_sessions set host_id = 'outra-maquina:ana', worker_id = 'w-x', status = 'running' where id = ${foreign}`;
    await cycle(world);
    const again = world.build({ workerId: "worker-1", runtimes: { claude: new ScriptedSessionRuntime() } });
    await again.supervisor.tick();
    expect((await sessionRowOf(world.setup, own)).status).toBe("running");
    expect((await sessionRowOf(world.setup, foreign)).status).toBe("running");
    expect(await systemNotes(world, own)).toEqual([]);
  });

  it("V-26b interrupts a session whose Claude process died mid-turn, with the same note", async () => {
    const world = await brokerWorld([{ kind: "text", text: "Começando." }, { kind: "crash" }]);
    const id = await world.open();
    await cycle(world);
    expect((await sessionRowOf(world.setup, id)).status).toBe("interrupted");
    expect(await systemNotes(world, id)).toEqual([RESTART_NOTE]);
    expect(world.worker.registry.ids()).toEqual([]);
  });

  it("V-26e never resumes an interrupted session without a message from the person", async () => {
    const world = await brokerWorld([], { claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await cycle(world);
    const next = await restartedWorker(world);
    for (let tick = 0; tick < 10; tick += 1) await next.worker.supervisor.tick();
    expect(next.runtime.resumes).toHaveLength(0);
    expect((await sessionRowOf(world.setup, id)).status).toBe("interrupted");
  });
});
