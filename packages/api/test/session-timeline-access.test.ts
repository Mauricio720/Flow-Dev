import { afterEach, describe, expect, it } from "vitest";
import { taskTerminalEvents, users } from "../src/infra/database/schema";
import { rejection } from "./planning-support";
import { moveClaimTo, openedFlowDevSession } from "./session-interaction-support";
import { at, seedEntries, timeline } from "./session-timeline-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.session.timeline access", () => {
  it("V-23c reports canControl for the person who opened the session and false after they lose the operator role", async () => {
    const world = await openedFlowDevSession();
    expect((await timeline(world)).canControl).toBe(true);
    await world.setup.authorize(world.setup.readerId);
    await moveClaimTo(world.setup, world.setup.readerId);
    expect((await timeline(world)).canControl).toBe(false);
    expect((await world.harness.callerFor(world.setup.readerId).session.timeline(world.scope)).canControl).toBe(false);
  });

  it("V-27e shows only events and no control for a session opened in the terminal by the previous version", async () => {
    const world = await openedFlowDevSession();
    await world.setup.client`update task_terminal_sessions set runtime = 'terminal' where id = ${world.sessionId}`;
    await world.setup.database.insert(taskTerminalEvents).values({ sessionId: world.sessionId, kind: "started", summary: "startup", occurredAt: at(1) });
    const page = await timeline(world);
    expect(page).toMatchObject({ canControl: false, pending: { requestIds: [] } });
    expect(page.entries.map((entry) => entry.type)).toEqual(["event"]);
  });

  it("V-27e hides the conversation from a person without access to the project and refuses a session of another task", async () => {
    const world = await openedFlowDevSession();
    const [outsider] = await world.setup.database.insert(users).values({ name: "Out", email: "out@test.invalid" }).returning();
    expect(await rejection(world.harness.callerFor(outsider!.id).session.timeline(world.scope))).toMatchObject({ code: "NOT_FOUND" });
    expect(await rejection(world.harness.caller.session.timeline({ ...world.scope, taskId: crypto.randomUUID() }))).toMatchObject({ code: "NOT_FOUND", reason: "task_unavailable" });
    expect(await rejection(timeline(world, "isto-nao-e-um-cursor"))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
  });

  it("lets a project member who did not open the session read it without control", async () => {
    const world = await openedFlowDevSession();
    await seedEntries(world, 3);
    await world.setup.authorize(world.setup.readerId);
    const page = await world.harness.callerFor(world.setup.readerId).session.timeline(world.scope);
    expect(page.canControl).toBe(false);
    expect(page.entries).toHaveLength(3);
  });
});
