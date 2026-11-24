import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionExitHandling } from "../src/application/services/terminal/sessionExit";
import { SessionHandlerFactory } from "../src/application/services/terminal/sessionHandlers";
import { SessionRecorder } from "../src/application/services/terminal/sessionRecorder";
import { SessionStarter } from "../src/application/services/terminal/sessionStarter";
import { SessionHandleRegistry } from "../src/application/services/terminal/sessionHandleRegistry";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { CodexAppServerRuntime } from "../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../src/infra/terminal/codex/codexProcess";
import { flowDevWorld, HOST_ID } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

const folders: string[] = [];
afterEach(async () => { await closeTaskFixture(); await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))); });

describe("Codex service startup failure", () => {
  it("V-49g persists a provider model limit as launch_failed before any turn starts", async () => {
    const { setup, session } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, model: "model-1", effort: "high", status: "opening" });
    const root = await mkdtemp(join(tmpdir(), "codex-service-start-"));
    folders.push(root);
    await mkdir(join(root, "skills"), { recursive: true });
    const scriptPath = join(root, "script.json");
    const recordPath = join(root, "requests.jsonl");
    await writeFile(scriptPath, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/start"], recordPath, errors: { "thread/start": { code: -32602, message: "model usage limit reached" } }, results: { initialize: {}, "skills/extraRoots/set": {} } }));
    const log = { info: () => undefined, error: () => undefined };
    const registry = new SessionHandleRegistry();
    const sessions = new DrizzleTerminalSessionDao(setup.database);
    const exit = new SessionExitHandling({ sessions, status: { transition: async () => null }, messages: new DrizzleSessionMessageDao(setup.database), cancellation: { cancelAll: async () => [] }, registry, now: () => new Date(), log });
    const recorder = new SessionRecorder({ messages: new DrizzleSessionMessageDao(setup.database), events: { ingest: async () => ({ captureTrigger: null }), capture: async () => undefined }, log });
    const handlers = new SessionHandlerFactory({ recorder, permissions: { handle: async () => ({ behavior: "deny", message: "denied" }) }, onExit: (current, outcome) => exit.handle(current, outcome), log });
    const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: scriptPath };
    const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
    const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
    const runtime = new CodexAppServerRuntime({ process: codexProcess, probe, log });
    const starter = new SessionStarter({ sessions, context: { readPrompt: async () => "Start", pathsOf: () => ({ contextDir: root, sessionDir: root, attachmentsDir: root }) }, runtimes: { codex: runtime }, handlers, registry, log });
    await starter.start(session);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await handlers.flush();
      const current = await sessions.findById(session.id);
      if (current?.launchFailedAt) {
        expect(current.launchError).toBe("Codex RPC thread/start: model usage limit reached");
        expect(registry.get(session.id)).toBeUndefined();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Codex start failure was not persisted");
  });
});
