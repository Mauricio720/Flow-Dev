import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { workerWorld, type WorkerWorld } from "./session-worker-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const sessionRow = async (world: WorkerWorld, id: string) => (await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id)))[0]!;

describe("session supervisor start", () => {
  it("V-24a starts only the sessions of its own host", async () => {
    const world = await workerWorld();
    const own = await world.open();
    const foreign = await world.open();
    await world.setup.client`update task_terminal_sessions set host_id = 'outra-maquina:ana' where id = ${foreign}`;
    await world.worker.supervisor.tick();
    expect(world.runtime.starts.map((start) => start.sessionId)).toEqual([own]);
    expect(await sessionRow(world, foreign)).toMatchObject({ workerId: null, status: "opening" });
    expect(await sessionRow(world, own)).toMatchObject({ workerId: "worker-1" });
  });

  it("V-24a starts the session in the linked clone with the stored prompt, the plugin folder and the chosen mode", async () => {
    const world = await workerWorld();
    const id = await world.open({ prompt: "/flow-dev:direct-executor siga", permissionMode: "ask_all" });
    await world.worker.supervisor.tick();
    const [start] = world.runtime.starts;
    expect(start).toMatchObject({ sessionId: id, cwd: world.clone, prompt: "/flow-dev:direct-executor siga", permissionMode: "ask_all" });
    expect(start!.contextDir.endsWith(`${id}/contexto`)).toBe(true);
  });

  it("V-24b starts a session once even when two supervisors of the same host tick at the same time", async () => {
    const second = new ScriptedSessionRuntime();
    const world = await workerWorld();
    const other = world.build({ runtimes: { claude: second }, workerId: "worker-2" });
    await world.open();
    await Promise.all([world.worker.supervisor.tick(), other.supervisor.tick()]);
    expect(world.runtime.starts.length + second.starts.length).toBe(1);
  });

  it("V-24g sends a session to launch_failed with the reason the runtime reports", async () => {
    const world = await workerWorld({ script: [{ kind: "fail", detail: "Not logged in" }] });
    const id = await world.open();
    await world.worker.supervisor.tick();
    await world.settle();
    expect(await sessionRow(world, id)).toMatchObject({ status: "launch_failed", launchError: "Not logged in" });
    expect(world.worker.registry.ids()).toEqual([]);
  });

  it("sends a session to launch_failed when its prompt file is gone, without calling the runtime", async () => {
    const world = await workerWorld();
    const id = await world.open();
    await rm(`${world.harness.state}/flow-dev/terminal-sessions/${id}/prompt.md`);
    await world.worker.supervisor.tick();
    expect(world.runtime.starts).toHaveLength(0);
    expect(await sessionRow(world, id)).toMatchObject({ status: "launch_failed", launchError: "O prompt da sessão não foi encontrado." });
  });

  it("V-24i writes the heartbeat of the host with the clock time", async () => {
    const world = await workerWorld();
    await world.worker.supervisor.beat();
    expect(await new DrizzleSessionHostDao(world.setup.database).lastBeat(machineIdentity())).toEqual({ hostId: machineIdentity(), workerId: "worker-1", heartbeatAt: world.clock.now(), codexStatus: null });
  });

  it("V-24i records the Claude session id and moves the session to running on the first message", async () => {
    const world = await workerWorld({ claudeSessionIdFor: () => "abc" });
    const id = await world.open();
    await world.worker.supervisor.tick();
    await world.settle();
    expect(await sessionRow(world, id)).toMatchObject({ claudeSessionId: "abc", status: "running" });
    expect(world.worker.registry.ids()).toEqual([id]);
  });

  it("beats on the first tick and again only after five seconds", async () => {
    const world = await workerWorld();
    const hosts = new DrizzleSessionHostDao(world.setup.database);
    await world.worker.supervisor.tick();
    const first = (await hosts.lastBeat(machineIdentity()))!.heartbeatAt;
    world.clock.advance(4_000);
    await world.worker.supervisor.tick();
    expect((await hosts.lastBeat(machineIdentity()))!.heartbeatAt).toEqual(first);
    world.clock.advance(1_000);
    await world.worker.supervisor.tick();
    expect((await hosts.lastBeat(machineIdentity()))!.heartbeatAt).toEqual(world.clock.now());
  });
});
