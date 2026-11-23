import { afterEach, describe, expect, it } from "vitest";
import { taskTerminalMessages } from "../src/infra/database/schema";
import { rejection } from "./planning-support";
import { moveClaimTo, openedFlowDevSession, setStatus } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const MAX_MESSAGE_LENGTH = 20_000;
const send = (world: Awaited<ReturnType<typeof openedFlowDevSession>>, content: string, requestKey: string = crypto.randomUUID(), userId?: string) => {
  const caller = userId ? world.harness.callerFor(userId) : world.harness.caller;
  return caller.session.send({ ...world.scope, content, requestKey });
};
const storedMessages = (world: Awaited<ReturnType<typeof openedFlowDevSession>>) => world.setup.database.select().from(taskTerminalMessages);

describe("tasks.session.send", () => {
  it("queues the message exactly as typed, including a skill command", async () => {
    const world = await openedFlowDevSession();
    const content = "/flow-dev:spec-to-tasks docs/specs/x\n  com   espaços  ";
    const { message } = await send(world, content);
    expect(message).toMatchObject({ role: "user", content, queued: true, undelivered: false, truncated: false });
    const [row] = await storedMessages(world);
    expect(row).toMatchObject({ sessionId: world.sessionId, role: "user", content, deliveredAt: null, undelivered: false });
  });

  it("V-23a refuses another operator who did not open the session and stores nothing", async () => {
    const world = await openedFlowDevSession();
    await moveClaimTo(world.setup, world.setup.readerId);
    expect(await rejection(send(world, "oi", crypto.randomUUID(), world.setup.readerId))).toMatchObject({ code: "FORBIDDEN", reason: "session_control_denied" });
    expect(await storedMessages(world)).toHaveLength(0);
  });

  it("V-23b refuses a project member who is not the operator", async () => {
    const world = await openedFlowDevSession();
    expect(await rejection(send(world, "oi", crypto.randomUUID(), world.setup.readerId))).toMatchObject({ code: "FORBIDDEN", reason: "session_control_denied" });
    expect(await storedMessages(world)).toHaveLength(0);
  });

  it("V-23c refuses the person who opened the session after they stopped being the operator", async () => {
    const world = await openedFlowDevSession();
    await moveClaimTo(world.setup, world.setup.readerId);
    const error = await world.harness.caller.session.send({ ...world.scope, content: "oi", requestKey: crypto.randomUUID() }).then(() => null, (caught: { code: string; message: string }) => caught);
    expect(error).toMatchObject({ code: "FORBIDDEN", message: "Só quem abriu a sessão, enquanto for a operadora, pode responder." });
    expect(await storedMessages(world)).toHaveLength(0);
  });

  it("refuses a session id that belongs to another task or does not exist", async () => {
    const world = await openedFlowDevSession();
    const foreign = world.harness.caller.session.send({ ...world.scope, sessionId: crypto.randomUUID(), content: "oi", requestKey: crypto.randomUUID() });
    expect(await rejection(foreign)).toMatchObject({ code: "FORBIDDEN", reason: "session_control_denied" });
    const otherTask = world.harness.caller.session.send({ ...world.scope, taskId: crypto.randomUUID(), content: "oi", requestKey: crypto.randomUUID() });
    expect(await rejection(otherTask)).toMatchObject({ reason: "session_control_denied" });
  });

  it("V-23d stores one row for a repeated request key, sequentially and concurrently, and returns the same message", async () => {
    const world = await openedFlowDevSession();
    const requestKey = crypto.randomUUID();
    const first = await send(world, "oi", requestKey);
    const repeat = await send(world, "oi de novo", requestKey);
    expect(repeat.message).toEqual(first.message);
    const concurrent = crypto.randomUUID();
    const results = await Promise.all([send(world, "a", concurrent), send(world, "a", concurrent), send(world, "a", concurrent)]);
    expect(new Set(results.map((result) => result.message.id)).size).toBe(1);
    expect(await storedMessages(world)).toHaveLength(2);
  });

  it("V-23g refuses an empty and a 20001-character message and accepts one with 20000", async () => {
    const world = await openedFlowDevSession();
    for (const content of ["", "   \n", "x".repeat(MAX_MESSAGE_LENGTH + 1)]) {
      expect(await rejection(send(world, content))).toMatchObject({ code: "BAD_REQUEST", reason: "message_invalid" });
    }
    expect(await storedMessages(world)).toHaveLength(0);
    const { message } = await send(world, "x".repeat(MAX_MESSAGE_LENGTH));
    expect(message.content).toHaveLength(MAX_MESSAGE_LENGTH);
  });

  it("accepts a message for an interrupted session, so the service can resume it", async () => {
    const world = await openedFlowDevSession();
    await setStatus(world.setup, world.sessionId, "interrupted");
    expect((await send(world, "Pode seguir")).message.queued).toBe(true);
  });
});
