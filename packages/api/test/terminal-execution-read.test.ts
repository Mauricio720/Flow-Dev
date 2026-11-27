import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { SESSION_RETENTION_MS } from "../src/application/services/terminal/terminalCleanup";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";
import { DAY_MS, MINUTE_MS, ago, executionWorld, seedAttachment, seedEvents, seedSession } from "./terminal-execution-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("terminal execution read", () => {
  it("V-08a returns empty lists for a task with no session", async () => {
    const { setup, reader } = await executionWorld();
    expect(await reader.read(setup.taskId, setup.ownerId, new Date())).toEqual({ sessions: [], artifacts: [] });
  });

  it("V-08b lists the most recent session first with person, route and times", async () => {
    const world = await executionWorld();
    const older = await seedSession(world, { status: "ended", openedAt: ago(2 * DAY_MS), endedAt: ago(DAY_MS), route: "prd" });
    const newer = await seedSession(world, { status: "running", userId: world.setup.readerId, openedAt: ago(MINUTE_MS) });
    await seedEvents(world.setup, { sessionId: newer.id, count: 2, from: ago(30_000) });
    const { sessions } = await world.reader.read(world.setup.taskId, world.setup.ownerId, new Date());
    expect(sessions.map((session) => [session.id, session.userName, session.route])).toEqual([[newer.id, "Admin", "tech_spec"], [older.id, "Member", "prd"]]);
    expect(sessions[0]).toMatchObject({ endedAt: null, lastEventAt: expect.any(String) });
    expect(sessions[1]).toMatchObject({ endedAt: older.endedAt!.toISOString(), lastEventAt: null });
  });

  it("V-08c keeps the 200 most recent events oldest first and counts the hidden ones", async () => {
    const world = await executionWorld();
    const session = await seedSession(world);
    await seedEvents(world.setup, { sessionId: session.id, count: 205 });
    const [view] = (await world.reader.read(world.setup.taskId, world.setup.ownerId, new Date())).sessions;
    expect(view!.events).toHaveLength(200);
    expect([view!.events[0]!.summary, view!.events.at(-1)!.summary]).toEqual(["evento 6", "evento 205"]);
    expect(view!.hiddenEvents).toBe(5);
  });

  it("does not expire opening sessions when the project does not own the task", async () => {
    const world = await executionWorld();
    const late = await seedSession(world, { openedAt: ago(DAY_MS) });
    await world.reader.expireUnconfirmed({ projectId: crypto.randomUUID(), taskId: world.setup.taskId }, new Date());
    const [stored] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, late.id));
    expect(stored!.status).toBe("opening");
    await world.reader.expireUnconfirmed({ projectId: world.setup.project.id, taskId: world.setup.taskId }, new Date());
    const [expired] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, late.id));
    expect(expired!.status).toBe("unconfirmed");
  });

  it("V-08d stores unconfirmed on read for an opening session past 60 s and for one from the previous spec", async () => {
    const world = await executionWorld();
    const late = await seedSession(world, { openedAt: ago(61_000) });
    const legacy = await seedSession(world, { openedAt: ago(DAY_MS) });
    const fresh = await seedSession(world, { openedAt: ago(10_000) });
    const harness = await terminalHarness(world.setup);
    const detail = await harness.caller.byId({ projectId: world.setup.project.id, taskId: world.setup.taskId });
    const statuses = Object.fromEntries(detail.execution.sessions.map((session) => [session.id, session.status]));
    expect(statuses).toEqual({ [late.id]: "unconfirmed", [legacy.id]: "unconfirmed", [fresh.id]: "opening" });
    const stored = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, late.id));
    expect(stored[0]!.status).toBe("unconfirmed");
  });

  it("V-08e shows the silence start after 30 minutes without changing the state", async () => {
    const world = await executionWorld();
    const silent = await seedSession(world, { status: "waiting", lastSignalAt: ago(31 * MINUTE_MS) });
    const recent = await seedSession(world, { status: "waiting", lastSignalAt: ago(29 * MINUTE_MS) });
    const ended = await seedSession(world, { status: "ended", lastSignalAt: ago(120 * MINUTE_MS) });
    const views = Object.fromEntries((await world.reader.read(world.setup.taskId, world.setup.ownerId, new Date())).sessions.map((session) => [session.id, session]));
    expect(views[silent.id]).toMatchObject({ status: "waiting", silentSince: silent.lastSignalAt.toISOString() });
    expect(views[recent.id]!.silentSince).toBeNull();
    expect(views[ended.id]!.silentSince).toBeNull();
  });

  it("V-08f gives attachments of live sessions an expiry date and marks removed ones", async () => {
    const world = await executionWorld();
    const live = await seedSession(world, { lastSignalAt: ago(DAY_MS) });
    const removed = await seedSession(world, { filesRemovedAt: new Date() });
    await seedAttachment(world.setup, { sessionId: live.id, name: "nota.md", contentType: "text/markdown", byteSize: 6 });
    await seedAttachment(world.setup, { sessionId: removed.id, name: "print.png", contentType: "image/png", byteSize: 11 });
    const views = Object.fromEntries((await world.reader.read(world.setup.taskId, world.setup.ownerId, new Date())).sessions.map((session) => [session.id, session]));
    const until = new Date(live.lastSignalAt.getTime() + SESSION_RETENTION_MS).toISOString();
    expect(views[live.id]!.attachments).toEqual([{ name: "nota.md", contentType: "text/markdown", byteSize: 6, availableUntil: until, removed: false }]);
    expect(views[removed.id]!.attachments).toEqual([{ name: "print.png", contentType: "image/png", byteSize: 11, availableUntil: null, removed: true }]);
  });

  it("V-08g exposes the dropped events count", async () => {
    const world = await executionWorld();
    await seedSession(world, { droppedEvents: 1 });
    expect((await world.reader.read(world.setup.taskId, world.setup.ownerId, new Date())).sessions[0]).toMatchObject({ droppedEvents: 1 });
  });
});
