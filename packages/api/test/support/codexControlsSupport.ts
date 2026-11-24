import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RuntimeHandlers } from "../../src/application/terminal/agentSessionRuntime";
import { CodexAppServerRuntime } from "../../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../../src/infra/terminal/codex/codexProcess";

export async function controlRuntime() {
  const root = await mkdtemp(join(tmpdir(), "codex-controls-"));
  const paths = { script: join(root, "script.json"), requests: join(root, "requests.jsonl"), childPid: join(root, "child.pid") };
  await writeFile(paths.script, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start", "turn/interrupt"], recordPath: paths.requests, childPidPath: paths.childPid, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-1" } }, "turn/start": { turn: { id: "turn-1" } }, "turn/interrupt": {} } }));
  return { root, paths };
}

export function startControlRuntime(script: string) {
  const handlers: RuntimeHandlers = { onAssistantText: () => undefined, onHook: () => undefined, onPermission: async () => ({ behavior: "deny", message: "denied" }), onExit: () => undefined };
  const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: script };
  const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
  const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
  const runtime = new CodexAppServerRuntime({ process: codexProcess, probe, log: { info: () => undefined, error: () => undefined } });
  const handle = runtime.start({ sessionId: crypto.randomUUID(), cwd: "/tmp", prompt: "Start", contextDir: "/tmp", permissionMode: "ask_all", model: "model-1", effort: "high", handlers });
  return handle;
}

export async function waitForFile(path: string, content?: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = await readFile(path, "utf8").catch(() => "");
    if (value && (!content || value.includes(content))) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Expected file content at ${path}`);
}

export async function cleanupControlRoots(roots: string[]) {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
}

export async function waitUntilDead(pid: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { process.kill(pid, 0); } catch { return; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Process ${pid} remained alive`);
}

export function processAlive(pid: number) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
