import { afterEach, describe, expect, it } from "vitest";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, messagesOf, restartedWorker, sendMessage } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const RESUME_FAILED = "Não foi possível retomar a conversa. Abra uma nova sessão.";
const systemNotes = async (world: Awaited<ReturnType<typeof brokerWorld>>, sessionId: string) => (await messagesOf(world, sessionId)).filter((message) => message.role === "system").map((message) => message.content);

describe("session resume after a restart", () => {
  it("V-26c resumes the same Claude conversation with the message that was queued when the service went down (B-23)", async () => {
    const world = await brokerWorld([], { claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await cycle(world);
    await sendMessage(world, id, "Pode seguir");
    const next = await restartedWorker(world);
    await next.worker.supervisor.tick();
    await world.settle();
    await next.worker.idle();
    expect(next.runtime.resumes).toMatchObject([{ sessionId: id, claudeSessionId: "abc", firstMessage: "Pode seguir", cwd: world.clone }]);
    const [queued] = (await messagesOf(world, id)).filter((message) => message.content === "Pode seguir");
    expect(queued!.deliveredAt).not.toBeNull();
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "running", workerId: "worker-2" });
  });

  it("V-26d ends a session that was interrupted before Claude started, marks the message undelivered and notes why", async () => {
    const world = await brokerWorld([]);
    const id = await world.open();
    await world.setup.client`update task_terminal_sessions set status = 'interrupted', worker_id = 'w-old' where id = ${id}`;
    await sendMessage(world, id, "Pode seguir");
    const next = await restartedWorker(world);
    await next.worker.supervisor.tick();
    expect(next.runtime.resumes).toHaveLength(0);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endReason: "resume_failed" });
    expect(await systemNotes(world, id)).toContain(RESUME_FAILED);
    const [message] = (await messagesOf(world, id)).filter((row) => row.role === "user");
    expect(message).toMatchObject({ content: "Pode seguir", undelivered: true, deliveredAt: null });
  });

  it("V-26d ends the session the same way when the resume call throws", async () => {
    const world = await brokerWorld([], { claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await cycle(world);
    await sendMessage(world, id, "Pode seguir");
    const next = await restartedWorker(world, new ScriptedSessionRuntime({ resumeFailure: new Error("conversa não encontrada") }));
    await next.worker.supervisor.tick();
    expect(next.runtime.resumes).toHaveLength(1);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endReason: "resume_failed" });
    const [message] = (await messagesOf(world, id)).filter((row) => row.content === "Pode seguir");
    expect(message).toMatchObject({ undelivered: true });
  });

  it("V-26d ends the session when the resumed process reports it could not start", async () => {
    const world = await brokerWorld([], { claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await cycle(world);
    await sendMessage(world, id, "Pode seguir");
    const next = await restartedWorker(world, new ScriptedSessionRuntime({ resumeScript: [{ kind: "fail", detail: "No conversation found" }] }));
    await next.worker.supervisor.tick();
    await world.settle();
    await next.worker.idle();
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endReason: "resume_failed" });
    expect((await messagesOf(world, id)).find((row) => row.content === "Pode seguir")).toMatchObject({ undelivered: true });
  });
});
