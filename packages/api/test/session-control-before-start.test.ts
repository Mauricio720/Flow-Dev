import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { requestsOf, sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, messagesOf, scopeOf, sendMessage, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const QUESTION = [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "a" }] }];
const INTERRUPTED_NOTE = "Interrompido por você";

describe("end requested before the service claims an opening session", () => {
  it.each(["opening", "unconfirmed"] as const)("ends a %s session without ever starting the runtime", async (initial) => {
    const world = await workerWorld({ script: [{ kind: "wait_message" }] });
    const id = await world.open();
    await world.setup.database.update(taskTerminalSessions).set({ status: initial }).where(eq(taskTerminalSessions.id, id));
    await world.harness.caller.session.end(scopeOf(world, id));
    await cycle(world);
    expect(world.runtime.starts).toEqual([]);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endRequestedAt: null, workerId: null });
  });

  it("still starts an opening session when nobody asked to end it", async () => {
    const world = await workerWorld({ script: [{ kind: "wait_message" }] });
    const id = await world.open();
    await cycle(world);
    expect(world.runtime.starts).toHaveLength(1);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "running", workerId: "worker-1" });
  });
});

describe("interrupt requested while the session has no active turn", () => {
  it("does not interrupt the turn resumed later and still registers its requests", async () => {
    const world = await brokerWorld([], { claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await cycle(world);
    await world.worker.registry.abandonAll();
    await world.setup.database.update(taskTerminalSessions).set({ status: "interrupted" }).where(eq(taskTerminalSessions.id, id));
    await world.harness.caller.session.interrupt(scopeOf(world, id));
    await sendMessage(world, id, "Pode seguir");
    const runtime = new ScriptedSessionRuntime({ resumeScript: [{ kind: "ask", questions: QUESTION }] });
    const next = world.build({ runtimes: { claude: runtime }, workerId: "worker-2" });
    await next.supervisor.tick();
    await next.idle();
    await next.supervisor.tick();
    await next.idle();
    expect(runtime.resumes).toHaveLength(1);
    expect(runtime.runnerOf(id).interrupts).toBe(0);
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["pending"]);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "asking", interruptRequestedAt: null });
    const notes = (await messagesOf(world, id)).filter((message) => message.role === "system").map((message) => message.content);
    expect(notes).not.toContain(INTERRUPTED_NOTE);
  });
});
