import { describe, expect, it, vi } from "vitest";
import type { RuntimeStartInput } from "../src/application/terminal/agentSessionRuntime";
import { CodexSession } from "../src/infra/terminal/codex/codexSession";
import { codexLogSink, MODEL_STATUS } from "./support/codexRuntimeHarness";
import { fakeCodexChild } from "./support/fakeCodexChild";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function input(onExit = vi.fn()): RuntimeStartInput {
  return { sessionId: "s", cwd: "/clone", prompt: "start", contextDir: "/context", permissionMode: "ask_all", model: "model-1", handlers: { onAssistantText: () => undefined, onHook: () => undefined, onPermission: async () => ({ behavior: "deny", message: "no" }), onExit } };
}

describe("Codex startup cancellation", () => {
  it("does not spawn after close while the catalog probe is pending", async () => {
    const probe = deferred<typeof MODEL_STATUS>();
    const start = vi.fn();
    const handle = new CodexSession(input(), { process: { start, terminate: vi.fn() } as never, probe: { read: () => probe.promise }, log: codexLogSink() });
    const closing = handle.close();
    probe.resolve(MODEL_STATUS);
    await closing;
    expect(start).not.toHaveBeenCalled();
  });

  it("terminates a child returned after close and sends no RPC request", async () => {
    const fake = fakeCodexChild();
    const spawned = deferred<void>();
    const childStart = deferred<typeof fake.child>();
    const terminate = vi.fn(async () => undefined);
    const process = { start: () => { spawned.resolve(); return childStart.promise; }, terminate };
    const handle = new CodexSession(input(), { process: process as never, probe: { read: async () => MODEL_STATUS }, log: codexLogSink() });
    await spawned.promise;
    const closing = handle.close();
    childStart.resolve(fake.child);
    await closing;
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(fake.requests).toEqual([]);
  });
});
