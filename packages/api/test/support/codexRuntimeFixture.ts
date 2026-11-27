import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RuntimeExit, RuntimeHandlers } from "../../src/application/terminal/agentSessionRuntime";
import type { RpcMessage } from "../../src/infra/terminal/codex/codexRpcFrames";

const ATTEMPTS = 50;
const ATTEMPT_DELAY_MS = 20;
const folders: string[] = [];
export const TURN_METHODS = ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"];
export const TURN_RESULTS = { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-1" } }, "turn/start": { turn: { id: "turn-1" } } };
const DEFAULT_TURN_NOTIFICATIONS: RpcMessage[] = [{ jsonrpc: "2.0", method: "item/completed", params: { threadId: "thread-1", item: { type: "agentMessage", text: "spec pronta" } } }, { jsonrpc: "2.0", method: "turn/completed", params: { threadId: "thread-1" } }];

export function cleanupCodexFolders() {
  return Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
}

export async function setup() {
  const root = await mkdtemp(join(tmpdir(), "codex-runtime-"));
  folders.push(root);
  const contextDir = join(root, "context");
  const image = join(root, "issue.png");
  await mkdir(join(contextDir, "skills", "spec-writer"), { recursive: true });
  await writeFile(join(contextDir, "skills", "spec-writer", "SKILL.md"), "---\nname: spec-writer\n---\n");
  await writeFile(image, "png");
  const files = { root, contextDir, image, recordPath: join(root, "requests.jsonl"), envRecordPath: join(root, "environment.json"), scriptPath: join(root, "script.json") };
  await writeTurnScript(files, DEFAULT_TURN_NOTIFICATIONS);
  return files;
}

export type CodexFiles = Awaited<ReturnType<typeof setup>>;

export function writeTurnScript(files: CodexFiles, notifications: RpcMessage[], envRecordNames?: string[]) {
  const script = { methods: TURN_METHODS, recordPath: files.recordPath, envRecordPath: files.envRecordPath, envRecordNames, notificationsByMethod: { "turn/start": notifications }, results: TURN_RESULTS };
  return writeFile(files.scriptPath, JSON.stringify(script));
}

export async function waitForRecordedTurn(path: string) {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const content = await readFile(path, "utf8").catch(() => "");
    if (content.includes("turn/start")) return;
    await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_MS));
  }
  throw new Error("Codex runtime did not send turn/start");
}

export function callbacks() {
  const hooks: unknown[] = [];
  const messages: string[] = [];
  let threadStarted!: () => void;
  const started = new Promise<void>((resolve) => { threadStarted = resolve; });
  let exit!: (outcome: RuntimeExit) => void;
  const onExit = new Promise<RuntimeExit>((resolve) => { exit = resolve; });
  const onHook = (hook: unknown) => { hooks.push(hook); if ((hook as { hook_event_name?: string }).hook_event_name === "SessionStart") threadStarted(); };
  const handlers: RuntimeHandlers = { onAssistantText: (text) => messages.push(text), onHook, onPermission: async () => ({ behavior: "deny", message: "denied" }), onExit: (outcome) => exit(outcome) };
  return { handlers, hooks, messages, onExit, started };
}
