import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, restartedWorker, sendMessage, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const CODEX_UNAVAILABLE = "O Codex ainda não conduz sessões no Flow Dev.";
type Columns = Partial<typeof taskTerminalSessions.$inferInsert>;
const chooseFor = (world: Awaited<ReturnType<typeof workerWorld>>, sessionId: string, columns: Columns) => world.setup.database.update(taskTerminalSessions).set(columns).where(eq(taskTerminalSessions.id, sessionId));

describe("session runtime registry by agent", () => {
  it("V-38b starts each session only in the runtime of its agent, with the stored model and effort", async () => {
    const claude = new ScriptedSessionRuntime();
    const codex = new ScriptedSessionRuntime();
    const world = await workerWorld({}, { runtimes: { claude, codex } });
    const forCodex = await world.open();
    const forClaude = await world.open();
    await chooseFor(world, forCodex, { agent: "codex", model: "gpt-6.1-sol", effort: "high" });
    await chooseFor(world, forClaude, { purpose: "plan_item", model: "sonnet", effort: "low" });
    await world.worker.supervisor.tick();
    await world.worker.idle();
    expect(codex.starts.map((start) => [start.sessionId, start.model, start.effort])).toEqual([[forCodex, "gpt-6.1-sol", "high"]]);
    expect(claude.starts.map((start) => [start.sessionId, start.model, start.effort])).toEqual([[forClaude, "sonnet", "low"]]);
  });

  it("V-38c starts a legacy route session with the default Claude model and effort", async () => {
    const world = await workerWorld();
    await world.open();
    await cycle(world);
    expect(world.runtime.starts).toHaveLength(1);
    expect(world.runtime.starts[0]!.model).toBe("opus");
    expect(world.runtime.starts[0]!.effort).toBe("max");
  });

  it("V-38d resumes a plan session with the model and effort it was started with", async () => {
    const world = await brokerWorld([], { claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await chooseFor(world, id, { purpose: "plan_item", model: "sonnet", effort: "high" });
    await cycle(world);
    expect(world.runtime.starts[0]).toMatchObject({ sessionId: id, model: "sonnet", effort: "high" });
    await sendMessage(world, id, "Pode seguir");
    const next = await restartedWorker(world);
    await next.worker.supervisor.tick();
    await next.worker.idle();
    expect(next.runtime.resumes).toMatchObject([{ sessionId: id, claudeSessionId: "abc", model: "sonnet", effort: "high" }]);
  });

  it("V-38e fails a Codex session with the reason when only the Claude is registered, and still starts the Claude one", async () => {
    const world = await workerWorld();
    const forCodex = await world.open();
    const forClaude = await world.open();
    await chooseFor(world, forCodex, { agent: "codex", model: "gpt-6.1-sol", effort: "high" });
    await cycle(world);
    expect(await sessionRowOf(world.setup, forCodex)).toMatchObject({ status: "launch_failed", launchError: CODEX_UNAVAILABLE });
    expect(world.runtime.starts.map((start) => start.sessionId)).toEqual([forClaude]);
    expect(await sessionRowOf(world.setup, forClaude)).toMatchObject({ status: "running" });
  });
});
