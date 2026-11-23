import { afterEach, describe, expect, it } from "vitest";
import { brokerWorld, cycle, messagesOf, scopeOf } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("session message delivery", () => {
  it("V-24j hands the queued messages to the runtime in order, exactly as typed, and marks both in the same tick", async () => {
    const world = await brokerWorld([]);
    const id = await world.open({ prompt: "primeiro prompt" });
    await cycle(world);
    const send = (content: string) => world.harness.caller.session.send({ ...scopeOf(world, id), content, requestKey: crypto.randomUUID() });
    await send("/flow-dev:spec-to-tasks  A");
    await send("B");
    await cycle(world);
    expect(world.runtime.runnerOf(id).received).toEqual(["primeiro prompt", "/flow-dev:spec-to-tasks  A", "B"]);
    const users = (await messagesOf(world, id)).filter((message) => message.role === "user");
    expect(users.map((message) => [message.content, message.deliveredAt])).toEqual([["/flow-dev:spec-to-tasks  A", world.clock.now()], ["B", world.clock.now()]]);
  });

  it("does not deliver a message again on the next tick, and leaves a queued message of a session that is not running alone", async () => {
    const world = await brokerWorld([]);
    const id = await world.open();
    await cycle(world);
    await world.harness.caller.session.send({ ...scopeOf(world, id), content: "uma vez", requestKey: crypto.randomUUID() });
    await cycle(world);
    await cycle(world);
    expect(world.runtime.runnerOf(id).received.filter((text) => text === "uma vez")).toHaveLength(1);
  });
});
