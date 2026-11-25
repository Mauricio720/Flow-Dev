import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifacts, taskArtifactVersions, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionControlDao } from "../src/infra/database/dao/terminal/drizzleSessionControlDao";
import { codexWorkerFlow } from "./support/codexWorkerFlowSupport";
import { flowDevWorld, HOST_ID, insertPendingRequest, requestRow, sessionRowOf } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

const roots: string[] = [];
afterEach(async () => { await closeTaskFixture(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("Codex worker service flow", () => {
  it("V-54a starts a Codex route without Claude, persists identity/version and captures the final spec on end", async () => {
    const { setup, session } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, status: "opening", model: "model-1", effort: "high", permissionMode: "ask_all" });
    const root = await mkdtemp(join(tmpdir(), "codex-service-flow-"));
    roots.push(root);
    const checkout = join(root, "checkout");
    const specPath = "docs/specs/codex-flow/spec.md";
    await mkdir(join(checkout, "docs/specs/codex-flow"), { recursive: true });
    await writeFile(join(checkout, specPath), "# Codex spec\n");
    await setup.database.update(taskTerminalSessions).set({ checkoutPath: checkout, preparedAt: new Date() }).where(eq(taskTerminalSessions.id, session.id));
    const record = join(root, "requests.jsonl");
    const script = { methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], recordPath: record, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-flow" } }, "turn/start": { turn: { id: "turn-flow" } } }, notificationsByMethod: { "turn/start": [{ jsonrpc: "2.0", method: "item/completed", params: { threadId: "thread-flow", item: { type: "agentMessage", text: "Spec criada" } } }, { jsonrpc: "2.0", method: "item/completed", params: { threadId: "thread-flow", item: { type: "fileChange", changes: [{ path: specPath, kind: { type: "add" }, diff: "" }] } } }, { jsonrpc: "2.0", method: "turn/completed", params: { threadId: "thread-flow" } }] } };
    const { worker } = await codexWorkerFlow({ database: setup.database, stateRoot: root, sessionId: session.id, checkout, prompt: "/flow-dev:spec-writer Escreva a spec", script });
    try {
      await worker.supervisor.tick();
      await waitFor(record, "turn/start");
      await waitForStatus(setup, session.id, "waiting");
      await worker.idle();
      await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "waiting", claudeSessionId: "thread-flow", agentVersion: "0.159.3", model: "model-1", effort: "high" });
      expect((await readFile(record, "utf8")).includes("thread/start")).toBe(true);
      await new DrizzleSessionControlDao(setup.database).requestEnd(session.id, new Date());
      await worker.supervisor.tick();
      await worker.idle();
      await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "ended" });
      const [artifact] = await setup.database.select().from(taskArtifacts);
      expect(artifact).toMatchObject({ relativePath: specPath, latestVersion: 1 });
      const [version] = await setup.database.select().from(taskArtifactVersions);
      expect(version).toMatchObject({ content: "# Codex spec\n", skill: "spec-writer", trigger: "stop" });
    } finally { await worker.registry.abandonAll(); }
  });

  it("V-49e maps a real app-server crash to an interrupted session and cancels pending requests", async () => {
    const { setup, session } = await flowDevWorld({ agent: "codex", hostId: HOST_ID, status: "opening", model: "model-1", effort: "high", permissionMode: "ask_all" });
    const root = await mkdtemp(join(tmpdir(), "codex-service-crash-"));
    roots.push(root);
    const checkout = join(root, "checkout");
    await mkdir(checkout, { recursive: true });
    await setup.database.update(taskTerminalSessions).set({ checkoutPath: checkout, preparedAt: new Date() }).where(eq(taskTerminalSessions.id, session.id));
    const pending = await insertPendingRequest({ setup, sessionId: session.id }, "question");
    const record = join(root, "requests.jsonl");
    const script = { methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], recordPath: record, exitAfterMethods: ["turn/start"], results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-crash" } }, "turn/start": { turn: { id: "turn-crash" } } } };
    const { worker } = await codexWorkerFlow({ database: setup.database, stateRoot: root, sessionId: session.id, checkout, prompt: "Start", script });
    await worker.supervisor.tick();
    await waitForStatus(setup, session.id, "interrupted");
    await worker.idle();
    await expect(requestRow(setup, pending.id)).resolves.toMatchObject({ status: "cancelled" });
    await expect(sessionRowOf(setup, session.id)).resolves.toMatchObject({ status: "interrupted" });
    const notes = await setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, session.id));
    expect(notes.filter((message) => message.role === "system").map((message) => message.content)).toHaveLength(1);
    await worker.registry.abandonAll();
  });
});

async function waitFor(path: string, text: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await readFile(path, "utf8").catch(() => "")).includes(text)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Codex worker did not start its first turn");
}

async function waitForStatus(setup: Awaited<ReturnType<typeof flowDevWorld>>["setup"], sessionId: string, status: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await sessionRowOf(setup, sessionId)).status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Session did not reach ${status}`);
}
