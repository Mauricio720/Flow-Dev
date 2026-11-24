import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeStartInput } from "../src/application/terminal/agentSessionRuntime";
import { codexLogSink, scriptedCodexRuntime } from "./support/codexRuntimeHarness";

const folders: string[] = [];
afterEach(async () => Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))));

async function fixture(changedPath: string) {
  const root = await mkdtemp(join(tmpdir(), "codex-file-approval-"));
  folders.push(root);
  await mkdir(join(root, "context", "skills"), { recursive: true });
  const responsesPath = join(root, "responses.jsonl");
  const scriptPath = join(root, "script.json");
  const started = { jsonrpc: "2.0", method: "item/started", params: { threadId: "thread-1", item: { id: "item-file", type: "fileChange", status: "inProgress", changes: [{ path: changedPath, kind: { type: "add" }, diff: "+novo" }] } } };
  const approval = { jsonrpc: "2.0", id: "file-approval", method: "item/fileChange/requestApproval", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-file", startedAtMs: 1 } };
  const methods = ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"];
  await writeFile(scriptPath, JSON.stringify({ methods, serverResponsesPath: responsesPath, notificationsByMethod: { "turn/start": [started] }, serverRequestsByMethod: { "turn/start": [approval] }, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-1" } }, "turn/start": { turn: { id: "turn-1" } } } }));
  return { root, scriptPath, responsesPath };
}

async function firstResponse(path: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const content = (await readFile(path, "utf8").catch(() => "")).trim();
    if (content) return JSON.parse(content.split("\n")[0]!) as { id: string; result: unknown };
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Codex file approval was not answered");
}

async function openSession(setup: { root: string; scriptPath: string }, permissionMode: RuntimeStartInput["permissionMode"]) {
  const onPermission = vi.fn(async () => ({ behavior: "deny" as const, message: "no" }));
  const handlers = { onAssistantText: () => undefined, onHook: () => undefined, onPermission, onExit: () => undefined };
  const handle = scriptedCodexRuntime(setup.scriptPath, codexLogSink()).start({ sessionId: "s", cwd: setup.root, prompt: "Start", contextDir: join(setup.root, "context"), permissionMode, model: "model-1", effort: "high", handlers });
  return { handle, onPermission };
}

describe("Codex file approval by permission mode", () => {
  it("accepts edits inside the clone in accept_edits without asking the operator", async () => {
    const setup = await fixture("src/novo.ts");
    const { handle, onPermission } = await openSession(setup, "accept_edits");
    await expect(firstResponse(setup.responsesPath)).resolves.toMatchObject({ id: "file-approval", result: { decision: "accept" } });
    expect(onPermission).not.toHaveBeenCalled();
    await handle.close();
  });

  it.each([["outside the clone", "../fora.ts", "accept_edits"], ["inside the clone", "src/novo.ts", "ask_all"]] as const)("asks the operator for an edit %s in %s", async (_name, changedPath, mode) => {
    const setup = await fixture(changedPath);
    const { handle, onPermission } = await openSession(setup, mode);
    await expect(firstResponse(setup.responsesPath)).resolves.toMatchObject({ id: "file-approval", result: { decision: "decline" } });
    expect(onPermission).toHaveBeenCalledTimes(1);
    expect(onPermission.mock.calls[0]![0]).toMatchObject({ toolName: "fileChange", input: { diff: expect.stringContaining(changedPath) } });
    await handle.close();
  });
});
