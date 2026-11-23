import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { rejection } from "./planning-support";
import { openedFlowDevSession, setStatus } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

type World = Awaited<ReturnType<typeof openedFlowDevSession>>;

const sessionRow = async (world: World) => (await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, world.sessionId)))[0]!;
const send = (world: World) => world.harness.caller.session.send({ ...world.scope, content: "oi", requestKey: crypto.randomUUID() });

describe("tasks.session.interrupt and tasks.session.end", () => {
  it("V-23i records only the interrupt request on a running session and leaves the status alone", async () => {
    const world = await openedFlowDevSession();
    await setStatus(world.setup, world.sessionId, "running");
    const { requestedAt } = await world.harness.caller.session.interrupt(world.scope);
    const row = await sessionRow(world);
    expect(row).toMatchObject({ status: "running", endRequestedAt: null });
    expect(row.interruptRequestedAt?.toISOString()).toBe(requestedAt);
  });

  it("V-23i records only the end request and leaves the status alone", async () => {
    const world = await openedFlowDevSession();
    await setStatus(world.setup, world.sessionId, "asking");
    const { requestedAt } = await world.harness.caller.session.end(world.scope);
    const row = await sessionRow(world);
    expect(row).toMatchObject({ status: "asking", interruptRequestedAt: null });
    expect(row.endRequestedAt?.toISOString()).toBe(requestedAt);
  });

  it("accepts an interrupt on a session that is waiting without an error, as in B-30", async () => {
    const world = await openedFlowDevSession();
    await setStatus(world.setup, world.sessionId, "waiting");
    await expect(world.harness.caller.session.interrupt(world.scope)).resolves.toHaveProperty("requestedAt");
  });

  it("V-23h refuses send, interrupt and end on an ended session and on a launch failure", async () => {
    const world = await openedFlowDevSession();
    for (const status of ["ended", "launch_failed"]) {
      await setStatus(world.setup, world.sessionId, status);
      expect(await rejection(send(world))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "session_not_active" });
      expect(await rejection(world.harness.caller.session.interrupt(world.scope))).toMatchObject({ reason: "session_not_active" });
      expect(await rejection(world.harness.caller.session.end(world.scope))).toMatchObject({ reason: "session_not_active" });
    }
    expect(await sessionRow(world)).toMatchObject({ interruptRequestedAt: null, endRequestedAt: null });
  });

  it("refuses to control a session opened in the terminal by the previous version", async () => {
    const world = await openedFlowDevSession();
    await world.setup.client`update task_terminal_sessions set runtime = 'terminal' where id = ${world.sessionId}`;
    expect(await rejection(world.harness.caller.session.end(world.scope))).toMatchObject({ reason: "session_not_active" });
  });

  it("refuses a person who did not open the session", async () => {
    const world = await openedFlowDevSession();
    const asReader = world.harness.callerFor(world.setup.readerId);
    expect(await rejection(asReader.session.interrupt(world.scope))).toMatchObject({ code: "FORBIDDEN", reason: "session_control_denied" });
    expect(await rejection(asReader.session.end(world.scope))).toMatchObject({ reason: "session_control_denied" });
    expect(await sessionRow(world)).toMatchObject({ interruptRequestedAt: null, endRequestedAt: null });
  });
});
