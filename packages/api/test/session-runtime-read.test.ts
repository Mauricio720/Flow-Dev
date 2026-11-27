import { afterEach, describe, expect, it } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { MINUTE_MS, executionWorld, seedSession } from "./terminal-execution-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const NOW = new Date("2026-11-23T14:32:00Z");
const before = (ms: number) => new Date(NOW.getTime() - ms);
const SILENT_FOR_MS = 31 * MINUTE_MS;
const SECOND_MS = 1_000;

describe("terminal execution read by runtime", () => {
  it("V-21d shows no silence for a Flow Dev session and keeps it for a terminal session", async () => {
    const world = await executionWorld();
    const flowDev = await seedSession(world, { runtime: "flow_dev", hostId: "m:a", status: "waiting", openedAt: before(SILENT_FOR_MS), lastSignalAt: before(SILENT_FOR_MS) });
    const terminal = await seedSession(world, { runtime: "terminal", status: "waiting", openedAt: before(SILENT_FOR_MS), lastSignalAt: before(SILENT_FOR_MS) });
    const { sessions } = await world.reader.read(world.setup.taskId, world.setup.ownerId, NOW);
    const byId = new Map(sessions.map((session) => [session.id, session]));
    expect(byId.get(flowDev.id)).toMatchObject({ runtime: "flow_dev", silentSince: null });
    expect(byId.get(terminal.id)).toMatchObject({ runtime: "terminal", silentSince: before(SILENT_FOR_MS).toISOString() });
  });

  it("V-21e expires a Flow Dev session still opening after 61 seconds and keeps it opening at 59", async () => {
    const world = await executionWorld();
    const late = await seedSession(world, { runtime: "flow_dev", hostId: "m:a", openedAt: before(61 * SECOND_MS) });
    const early = await seedSession(world, { runtime: "flow_dev", hostId: "m:a", openedAt: before(59 * SECOND_MS) });
    await world.reader.expireUnconfirmed({ projectId: world.setup.project.id, taskId: world.setup.taskId }, NOW);
    const { sessions } = await world.reader.read(world.setup.taskId, world.setup.ownerId, NOW);
    const statusOf = (id: string) => sessions.find((session) => session.id === id)!.status;
    expect([statusOf(late.id), statusOf(early.id)]).toEqual(["unconfirmed", "opening"]);
  });
});
