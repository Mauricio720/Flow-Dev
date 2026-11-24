import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RuntimeHandlers } from "../src/application/terminal/agentSessionRuntime";
import { CodexAppServerRuntime } from "../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../src/infra/terminal/codex/codexProcess";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

function harness() {
  const exits: Array<{ kind: string; detail?: string }> = [];
  const handlers: RuntimeHandlers = { onAssistantText: () => undefined, onHook: () => undefined, onPermission: async () => ({ behavior: "deny", message: "denied" }), onExit: (outcome) => exits.push(outcome) };
  const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: "" };
  const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
  const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
  return { handlers, exits, env, runtime: new CodexAppServerRuntime({ process: codexProcess, probe, log: { info: () => undefined, error: () => undefined } }) };
}

async function fixture(options: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), "codex-recovery-"));
  roots.push(root);
  const script = join(root, "script.json");
  const record = join(root, "requests.jsonl");
  await writeFile(script, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/resume", "turn/start"], recordPath: record, ...options }));
  return { root, script, record };
}

async function waitForCalls(path: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const calls = await readFile(path, "utf8").catch(() => "");
    if (calls.includes("turn/start")) return calls.trim().split("\n").map((line) => JSON.parse(line) as { method: string; params: Record<string, unknown> });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Codex recovery requests were not recorded");
}

describe("Codex runtime recovery", () => {
  it("V-49f resumes the same thread with persisted choices and the first queued message", async () => {
    const files = await fixture({ results: { initialize: {}, "skills/extraRoots/set": {}, "thread/resume": { thread: { id: "thread-original" } }, "turn/start": { turn: { id: "turn-next" } } } });
    const setup = harness();
    setup.env[CODEX_FAKE_SCRIPT_VARIABLE] = files.script;
    const handle = setup.runtime.resume({ sessionId: "session", claudeSessionId: "thread-original", cwd: files.root, contextDir: files.root, permissionMode: "ask_all", model: "model-1", effort: "high", firstMessage: "Continue a conversa", handlers: setup.handlers });
    const calls = await waitForCalls(files.record);
    await handle.close();
    expect(calls.map((call) => call.method)).toEqual(["initialize", "skills/extraRoots/set", "thread/resume", "turn/start"]);
    expect(calls[2]?.params).toMatchObject({ threadId: "thread-original", model: "model-1", approvalPolicy: "untrusted", sandbox: "workspace-write" });
    expect(calls[3]?.params).toMatchObject({ threadId: "thread-original", model: "model-1", effort: "high", input: [{ type: "text", text: "Continue a conversa", text_elements: [] }] });
  });

  it("V-49e reports a real app-server exit during a turn as crashed", async () => {
    const files = await fixture({ methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], exitAfterMethods: ["turn/start"], results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-crash" } }, "turn/start": { turn: { id: "turn-crash" } } } });
    const setup = harness();
    setup.env[CODEX_FAKE_SCRIPT_VARIABLE] = files.script;
    setup.runtime.start({ sessionId: "session", cwd: files.root, contextDir: files.root, permissionMode: "ask_all", model: "model-1", effort: "high", prompt: "Start", handlers: setup.handlers });
    await waitForCalls(files.record);
    for (let attempt = 0; attempt < 50 && setup.exits.length === 0; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    expect(setup.exits).toEqual([{ kind: "crashed", detail: "Codex app-server exited (0)" }]);
  });
});
