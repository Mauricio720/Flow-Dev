import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createSessionWorker } from "../src/infra/sessionWorkerComposition";
import type { requireDatabase } from "../src/infra/database/client";
import { CodexAppServerRuntime } from "../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../src/infra/terminal/codex/codexProcess";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { taskTerminalMessages } from "../src/infra/database/schema";
import { flowDevWorld, HOST_ID, insertPendingRequest, requestRow, sessionRowOf } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

const roots: string[] = [];
afterEach(async () => { await closeTaskFixture(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

function runtime(scriptPath: string) {
  const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: scriptPath };
  const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
  const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
  return new CodexAppServerRuntime({ process: codexProcess, probe, log: { info: () => undefined, error: () => undefined } });
}

async function script(root: string, errors: Record<string, { code: number; message: string }> = {}) {
  const path = join(root, "script.json");
  const record = join(root, "requests.jsonl");
  await writeFile(path, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/resume", "turn/start"], recordPath: record, errors, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/resume": { thread: { id: "thread-persisted" } }, "turn/start": { turn: { id: "turn-resumed" } } } }));
  return { path, record };
}

async function waitFor(path: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = await readFile(path, "utf8").catch(() => "");
    if (value.includes("turn/start")) return value.trim().split("\n").map((line) => JSON.parse(line) as { method: string; params: Record<string, unknown> });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Codex session was not resumed");
}

function createRecoveryWorker(database: ReturnType<typeof requireDatabase>, root: string, scriptPath: string) {
  return createSessionWorker(database, { runtimes: { codex: runtime(scriptPath) }, env: { ...process.env, XDG_STATE_HOME: root, FLOW_DEV_SKILLS_DIR: join(process.cwd(), ".claude", "skills") }, hostId: HOST_ID, workerId: "worker-new", log: { info: () => undefined, error: () => undefined } });
}

describe("Codex service recovery", () => {
  it("V-54d waits for a new message, cancels stale requests and resumes once via Postgres", async () => {
    const { setup, session } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, workerId: "worker-old", model: "model-1", effort: "high", status: "running", claudeSessionId: "thread-persisted" });
    const root = await mkdtemp(join(tmpdir(), "codex-service-recovery-"));
    roots.push(root);
    const files = await script(root);
    const pending = await insertPendingRequest({ setup, sessionId: session.id }, "question");
    const messages = new DrizzleSessionMessageDao(setup.database);
    const worker = await createRecoveryWorker(setup.database, root, files.path);
    await worker.supervisor.tick();
    await expect(requestRow(setup, pending.id)).resolves.toMatchObject({ status: "cancelled" });
    await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "interrupted" });
    expect(await readFile(files.record, "utf8").catch(() => "")).toBe("");
    const message = await messages.insertUserMessage({ sessionId: session.id, content: "Continue daqui", requestKey: crypto.randomUUID() });
    await worker.supervisor.tick();
    const calls = await waitFor(files.record);
    await worker.idle();
    expect(calls.map((call) => call.method)).toEqual(["initialize", "skills/extraRoots/set", "thread/resume", "turn/start"]);
    expect(calls[2]?.params).toMatchObject({ threadId: "thread-persisted", model: "model-1", approvalPolicy: "never", sandbox: "danger-full-access" });
    expect(calls[3]?.params).toMatchObject({ threadId: "thread-persisted", effort: "high", input: [{ type: "text", text: "Continue daqui", text_elements: [] }] });
    await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "running", workerId: "worker-new", model: "model-1", effort: "high" });
    const [stored] = await setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.id, message.message.id));
    expect(stored?.deliveredAt).not.toBeNull();
    await worker.registry.abandonAll();
    await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "running" });
  });

  it("V-49f ends and marks the queued message undelivered when thread/resume fails", async () => {
    const { setup, session } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, workerId: "worker-old", model: "model-1", effort: "high", status: "interrupted", claudeSessionId: "thread-missing" });
    const root = await mkdtemp(join(tmpdir(), "codex-resume-failure-"));
    roots.push(root);
    const files = await script(root, { "thread/resume": { code: -32000, message: "conversation not found" } });
    const messages = new DrizzleSessionMessageDao(setup.database);
    const queued = await messages.insertUserMessage({ sessionId: session.id, content: "Retome", requestKey: crypto.randomUUID() });
    const worker = await createRecoveryWorker(setup.database, root, files.path);
    await worker.supervisor.tick();
    await waitForEnded(setup, session.id);
    await worker.idle();
    await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "ended", endReason: "resume_failed" });
    const [stored] = await setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.id, queued.message.id));
    expect(stored).toMatchObject({ undelivered: true });
    await expect(readFile(files.record, "utf8")).resolves.toContain("thread/resume");
  });
});

async function waitForEnded(setup: Awaited<ReturnType<typeof flowDevWorld>>["setup"], sessionId: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if ((await sessionRowOf(setup, sessionId)).status === "ended") return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Failed resume did not end the session");
}
