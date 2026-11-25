import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { SystemMessageSender } from "../src/application/services/terminal/systemMessageSender";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { closeTaskFixture } from "./task-api-support";
import { cycle, messagesOf, restartedWorker, workerWorld } from "./session-worker-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const LIVE_MESSAGE = "Revise o documento de etapa da revisão.";
const RESUME_MESSAGE = "Continue a execução pela mesma conversa.";
const SCRIPT = [{ kind: "wait_message" as const }, { kind: "end_turn" as const }];

describe("SystemMessageSender", () => {
  it("V-05k deduplicates, delivers to a live session on tick and resumes an interrupted session with its message", async () => {
    const world = await workerWorld({ script: SCRIPT });
    const sessionId = await world.open();
    await cycle(world);
    const sender = new SystemMessageSender({ messages: new DrizzleSessionMessageDao(world.setup.database) });
    const requestKey = crypto.randomUUID();
    expect(await sender.send({ sessionId, content: LIVE_MESSAGE, requestKey })).toEqual({ created: true });
    expect(await sender.send({ sessionId, content: "conteúdo repetido", requestKey })).toEqual({ created: false });
    const [queued] = (await messagesOf(world, sessionId)).filter((message) => message.requestKey === requestKey);
    expect(queued).toMatchObject({ role: "user", content: LIVE_MESSAGE, deliveredAt: null, undelivered: false });
    await cycle(world);
    expect(world.runtime.runnerOf(sessionId).received).toContain(LIVE_MESSAGE);
    expect((await messagesOf(world, sessionId)).find((message) => message.requestKey === requestKey)?.deliveredAt).toBeInstanceOf(Date);
    await world.setup.database.update(taskTerminalSessions).set({ status: "interrupted" }).where(eq(taskTerminalSessions.id, sessionId));
    await world.worker.registry.get(sessionId)?.abandon();
    world.worker.registry.delete(sessionId);
    const resumeKey = crypto.randomUUID();
    expect(await sender.send({ sessionId, content: RESUME_MESSAGE, requestKey: resumeKey })).toEqual({ created: true });
    const next = await restartedWorker(world);
    await next.worker.supervisor.tick();
    await Promise.all([...next.runtime.runners.values()].map((runner) => runner.settled()));
    await next.worker.idle();
    expect(next.runtime.resumes).toMatchObject([{ sessionId, firstMessage: RESUME_MESSAGE }]);
    expect((await messagesOf(world, sessionId)).find((message) => message.requestKey === resumeKey)?.deliveredAt).toBeInstanceOf(Date);
  });
});
