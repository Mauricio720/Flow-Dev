import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CodexAppServerRuntime } from "../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../src/infra/terminal/codex/codexProcess";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { SessionHandleRegistry } from "../src/application/services/terminal/sessionHandleRegistry";
import { MessageDeliveryStep } from "../src/application/services/terminal/messageDelivery";
import { flowDevWorld, HOST_ID } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";
import { randomUUID } from "node:crypto";

afterEach(async () => { await closeTaskFixture(); await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))); });
const folders: string[] = [];

async function waitForTurns(path: string, count: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const lines = (await readFile(path, "utf8").catch(() => "")).trim().split("\n").filter((line) => line.includes('"method":"turn/start"'));
    if (lines.length >= count) return lines.map((line) => JSON.parse(line) as { params: { input: Array<{ text?: string }> } });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Expected ${count} Codex turns`);
}

describe("Codex service message delivery", () => {
  it("V-54c queues active-turn messages once, starts them after completion and acknowledges delivery", async () => {
    const { setup, session } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, model: "model-1", effort: "high", permissionMode: "ask_all", status: "running" });
    const root = await mkdtemp(join(tmpdir(), "codex-messages-"));
    folders.push(root);
    const contextDir = join(root, "context");
    await mkdir(join(contextDir, "skills"), { recursive: true });
    const recordPath = join(root, "requests.jsonl");
    const releasePath = join(root, "continue");
    const scriptPath = join(root, "script.json");
    await writeFile(scriptPath, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], recordPath, waitForPath: releasePath, notificationsByMethod: { "turn/start": [{ jsonrpc: "2.0", method: "turn/completed", params: { threadId: "thread-1" } }] }, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-1" } }, "turn/start": { turn: { id: "turn-1" } } } }));
    const handlers = { onAssistantText: () => undefined, onHook: () => undefined, onPermission: async () => ({ behavior: "deny" as const, message: "denied" }), onExit: () => undefined };
    const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: scriptPath };
    const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
    const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
    const handle = new CodexAppServerRuntime({ process: codexProcess, probe, log: { info: () => undefined, error: () => undefined }, requestUserInput: false }).start({ sessionId: session.id, cwd: root, prompt: "initial", contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", handlers });
    await waitForTurns(recordPath, 1);
    const messages = new DrizzleSessionMessageDao(setup.database);
    const firstKey = randomUUID();
    const secondKey = randomUUID();
    await messages.insertUserMessage({ sessionId: session.id, content: "first queued", requestKey: firstKey });
    await messages.insertUserMessage({ sessionId: session.id, content: "second queued", requestKey: secondKey });
    await messages.insertUserMessage({ sessionId: session.id, content: "first queued", requestKey: firstKey });
    const registry = new SessionHandleRegistry();
    registry.set(session.id, handle);
    const delivery = new MessageDeliveryStep({ registry, messages, now: () => new Date("2026-11-23T14:32:00Z"), log: { info: () => undefined, error: () => undefined } });
    await delivery.run();
    await delivery.run();
    expect(await messages.listUndelivered(session.id)).toEqual([]);
    await writeFile(releasePath, "continue");
    const turns = await waitForTurns(recordPath, 3);
    expect(turns.map((turn) => turn.params.input[0]?.text)).toEqual(["initial", "first queued", "second queued"]);
    const startOptions = (await readFile(recordPath, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as { method?: string; params?: Record<string, unknown> }).find((entry) => entry.method === "thread/start");
    expect(startOptions?.params?.config).toEqual({ features: { default_mode_request_user_input: false } });
    await handle.close();
  });
});
