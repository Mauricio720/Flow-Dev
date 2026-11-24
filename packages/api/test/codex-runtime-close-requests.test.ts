import { describe, expect, it, vi } from "vitest";
import type { RuntimeStartInput } from "../src/application/terminal/agentSessionRuntime";
import { CodexSession } from "../src/infra/terminal/codex/codexSession";
import { codexLogSink, MODEL_STATUS } from "./support/codexRuntimeHarness";
import { fakeCodexChild } from "./support/fakeCodexChild";

async function openUntil(method: "thread/start" | "turn/start") {
  const fake = fakeCodexChild();
  const sink = codexLogSink();
  const exits: Array<{ kind: string }> = [];
  const hooks: string[] = [];
  const terminate = vi.fn(async () => undefined);
  const input: RuntimeStartInput = { sessionId: "s", cwd: "/clone", prompt: "start", contextDir: "/context", permissionMode: "ask_all", model: "model-1", handlers: { onAssistantText: () => undefined, onHook: (hook) => hooks.push(hook.hook_event_name), onPermission: async () => ({ behavior: "deny", message: "no" }), onExit: (outcome) => exits.push(outcome) } };
  const handle = new CodexSession(input, { process: { start: async () => fake.child, terminate } as never, probe: { read: async () => MODEL_STATUS }, log: sink });
  await fake.answer("initialize", {});
  await fake.answer("skills/extraRoots/set", {});
  if (method === "turn/start") await fake.answer("thread/start", { thread: { id: "thread-1" } });
  return { fake, handle, sink, exits, hooks, terminate };
}

describe("Codex close during the opening requests", () => {
  it("starts no turn when close arrives as thread/start is answered", async () => {
    const { fake, handle, exits, hooks, terminate } = await openUntil("thread/start");
    fake.respond((await fake.requested("thread/start")).id, { thread: { id: "thread-1" } });
    await handle.close();
    expect(fake.requests.map((request) => request.method)).not.toContain("turn/start");
    expect(hooks).not.toContain("UserPromptSubmit");
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(exits).toEqual([{ kind: "ended" }]);
  });

  it("reports no started turn when close arrives as turn/start is answered", async () => {
    const { fake, handle, sink, exits, terminate } = await openUntil("turn/start");
    fake.respond((await fake.requested("turn/start")).id, { turn: { id: "turn-1" } });
    const closing = handle.close();
    await fake.answer("thread/unsubscribe", true);
    await closing;
    expect(sink.entries.map((entry) => entry.event)).not.toContain("codex_turn_started");
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(exits).toEqual([{ kind: "ended" }]);
  });

  it("ends once and unsubscribes before terminating when close arrives with turn/start pending", async () => {
    const { fake, handle, exits, terminate } = await openUntil("turn/start");
    await fake.requested("turn/start");
    const closing = handle.close();
    await fake.answer("thread/unsubscribe", true);
    await closing;
    expect(fake.requests.map((request) => request.method).slice(-2)).toEqual(["turn/start", "thread/unsubscribe"]);
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(exits).toEqual([{ kind: "ended" }]);
  });

  it("terminates the group even when thread/unsubscribe is rejected", async () => {
    const { fake, handle, exits, terminate } = await openUntil("turn/start");
    await fake.answer("turn/start", { turn: { id: "turn-1" } });
    const closing = handle.close();
    const unsubscribe = await fake.requested("thread/unsubscribe");
    fake.child.stdout?.emit("data", Buffer.from(`${JSON.stringify({ jsonrpc: "2.0", id: unsubscribe.id, error: { code: -32600, message: "unknown thread" } })}\n`));
    await closing;
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(exits).toEqual([{ kind: "ended" }]);
  });
});
