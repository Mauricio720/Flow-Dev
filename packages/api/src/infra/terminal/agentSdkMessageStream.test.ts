import { describe, expect, it } from "vitest";
import { UserMessageQueue } from "./agentSdkMessageStream";

async function nextText(iterator: AsyncIterator<{ message: { content: unknown } }>) {
  const result = await iterator.next();
  return result.done ? null : result.value.message.content;
}

describe("UserMessageQueue", () => {
  it("delivers the messages in the order they were pushed, as typed, before and after the reader waits", async () => {
    const queue = new UserMessageQueue();
    queue.push("/flow-dev:spec-to-tasks  docs/x");
    queue.push("segunda");
    const iterator = queue[Symbol.asyncIterator]();
    expect(await nextText(iterator)).toBe("/flow-dev:spec-to-tasks  docs/x");
    expect(await nextText(iterator)).toBe("segunda");
    const waiting = nextText(iterator);
    queue.push("terceira");
    expect(await waiting).toBe("terceira");
  });

  it("ends the stream when closed, including a reader that is already waiting", async () => {
    const queue = new UserMessageQueue();
    const iterator = queue[Symbol.asyncIterator]();
    const waiting = iterator.next();
    queue.close();
    expect((await waiting).done).toBe(true);
    expect((await iterator.next()).done).toBe(true);
  });

  it("builds a user message with no parent tool use", async () => {
    const queue = new UserMessageQueue();
    queue.push("oi");
    const result = await queue[Symbol.asyncIterator]().next();
    expect(result.value).toEqual({ type: "user", message: { role: "user", content: "oi" }, parent_tool_use_id: null });
  });
});
