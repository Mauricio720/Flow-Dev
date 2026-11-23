import { afterEach, describe, expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { HARNESS_NOW } from "./terminal-harness";
import { readySetup } from "./terminal-open-support";
import { cleanupTerminalFolders, openInput, readSessionPrompt, sessionFolder } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const OFFLINE_MESSAGE = "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.";
const FRESH_BEAT_MS = 5_000;
const STALE_BEAT_MS = 16_000;
const HEARTBEAT_LIMIT_MS = 15_000;

type World = Awaited<ReturnType<typeof readySetup>>;

async function beatAgo(world: World, ageMs: number) {
  await world.harness.hosts.beat({ hostId: machineIdentity(), workerId: "worker-test", heartbeatAt: new Date(HARNESS_NOW.getTime() - ageMs) });
}

const scopeOf = (world: World) => ({ projectId: world.setup.project.id, taskId: world.setup.taskId });
const serviceRunning = async (world: World) => (await world.harness.caller.terminal.preflight(scopeOf(world))).sessionService.running;

describe("tasks.terminal.open with the sessions service", () => {
  it("V-29b records the permission mode, the host and the four skills with the prompt, and starts nothing", async () => {
    const world = await readySetup();
    const result = await world.harness.caller.terminal.open(openInput(world.setup, { permissionMode: "accept_edits", prompt: "/flow-dev:direct-executor siga" }));
    const [session] = await world.setup.database.select().from(taskTerminalSessions);
    expect(session).toMatchObject({ status: "opening", runtime: "flow_dev", permissionMode: "accept_edits", hostId: machineIdentity(), workerId: null });
    const skills = await readdir(join(sessionFolder(world.harness.state, result.sessionId), "contexto", "skills"));
    expect(skills.sort()).toEqual(["direct-executor", "spec-conformance", "spec-to-tasks", "spec-writer"]);
    expect(await readSessionPrompt(world.harness.state, result.sessionId)).toBe("/flow-dev:direct-executor siga");
  });

  it("defaults the permission mode to bypass and refuses an unknown mode", async () => {
    const world = await readySetup();
    const input = openInput(world.setup);
    delete (input as Record<string, unknown>).permissionMode;
    await world.harness.caller.terminal.open(input);
    const [session] = await world.setup.database.select().from(taskTerminalSessions);
    expect(session!.permissionMode).toBe("bypass");
    const invalid = world.harness.caller.terminal.open(openInput(world.setup, { permissionMode: "yolo" }) as never);
    await expect(invalid).rejects.toBeInstanceOf(TRPCError);
  });

  it("V-29c reports the service as stopped after 16 seconds without a heartbeat and refuses to open", async () => {
    const world = await readySetup();
    await beatAgo(world, STALE_BEAT_MS);
    expect(await serviceRunning(world)).toBe(false);
    const error = await world.harness.caller.terminal.open(openInput(world.setup)).then(() => null, (caught: unknown) => caught as TRPCError & { cause?: { reason: string } });
    expect(error).toMatchObject({ code: "PRECONDITION_FAILED", message: OFFLINE_MESSAGE });
    expect(error?.cause?.reason).toBe("session_service_offline");
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(0);
  });

  it("V-29c reports the service as running with a 5-second-old heartbeat", async () => {
    const world = await readySetup();
    await beatAgo(world, FRESH_BEAT_MS);
    expect(await serviceRunning(world)).toBe(true);
  });

  it("V-29c treats a heartbeat of exactly 15 seconds as stopped and one just under it as running", async () => {
    const world = await readySetup();
    await beatAgo(world, HEARTBEAT_LIMIT_MS);
    expect(await serviceRunning(world)).toBe(false);
    await beatAgo(world, HEARTBEAT_LIMIT_MS - 1);
    expect(await serviceRunning(world)).toBe(true);
  });

  it("V-29c reports the service as stopped when this machine never sent a heartbeat", async () => {
    const world = await readySetup({ serviceRunning: false });
    expect(await serviceRunning(world)).toBe(false);
  });

  it("ignores the heartbeat of another machine", async () => {
    const world = await readySetup({ serviceRunning: false });
    await world.harness.hosts.beat({ hostId: "outra-maquina:ana", workerId: "w", heartbeatAt: HARNESS_NOW });
    expect(await serviceRunning(world)).toBe(false);
  });
});
