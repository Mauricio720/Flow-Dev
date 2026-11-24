import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RuntimeHandlers } from "../src/application/terminal/agentSessionRuntime";
import { CodexAppServerRuntime } from "../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../src/infra/terminal/codex/codexProcess";

const folders: string[] = [];
afterEach(async () => Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))));

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "codex-requests-"));
  folders.push(root);
  const contextDir = join(root, "context");
  await mkdir(join(contextDir, "skills"), { recursive: true });
  const recordPath = join(root, "requests.jsonl");
  const responsesPath = join(root, "responses.jsonl");
  const scriptPath = join(root, "script.json");
  const requests = [
    { jsonrpc: "2.0", id: "secret-question", method: "item/tool/requestUserInput", params: { threadId: "subagent-1", turnId: "subturn", itemId: "item-question", questions: [{ id: "question-1", header: "Credencial", question: "Token?", isOther: false, isSecret: true, options: null }] } },
    { jsonrpc: "2.0", id: "command-approval", method: "item/commandExecution/requestApproval", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-command", command: "pnpm test", cwd: root, availableDecisions: ["accept", "acceptForSession", "decline"], proposedExecpolicyAmendment: ["Bash(pnpm test:*)"] } },
    { jsonrpc: "2.0", id: "file-approval", method: "item/fileChange/requestApproval", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-file", reason: "Editar arquivo" } },
    { jsonrpc: "2.0", id: "permissions-approval", method: "item/permissions/requestApproval", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-permission", cwd: root, reason: "Acesso adicional", startedAtMs: 1, permissions: { network: { enabled: true } } } },
    { jsonrpc: "2.0", id: "permissions-denial", method: "item/permissions/requestApproval", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-permission-denied", cwd: root, reason: "Bloquear rede", startedAtMs: 2, permissions: { network: { enabled: true } } } },
  ];
  const fileNotification = { jsonrpc: "2.0", method: "item/started", params: { threadId: "thread-1", item: { id: "item-file", type: "fileChange", changes: [{ path: "src/a.ts", kind: { type: "update", move_path: null }, diff: "-old\\n+new" }] } } };
  const script = { methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], recordPath, serverResponsesPath: responsesPath, notificationsByMethod: { "turn/start": [fileNotification] }, serverRequestsByMethod: { initialize: requests.slice(0, 2), "turn/start": requests.slice(2) }, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-1" } }, "turn/start": { turn: { id: "turn-1" } } } };
  await writeFile(scriptPath, JSON.stringify(script));
  return { root, contextDir, scriptPath, recordPath, responsesPath };
}

async function waitForResponses(path: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const lines = (await readFile(path, "utf8").catch(() => "")).trim().split("\n").filter(Boolean);
    if (lines.length === 5) return lines.map((line) => JSON.parse(line) as { id: string; result: Record<string, unknown> });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Codex server requests were not answered");
}

async function waitForTurns(path: string, count: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const calls = (await readFile(path, "utf8").catch(() => "")).split("\n").filter((line) => line.includes('"method":"turn/start"'));
    if (calls.length >= count) return calls.map((line) => JSON.parse(line) as { params: { input: Array<{ text?: string }> } });
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Codex did not start turn ${count}`);
}

describe("Codex runtime server requests", () => {
  it("V-49b routes subagent secret questions and command approvals through the broker response id", async () => {
    const data = await fixture();
    const seen: Array<{ toolName: string; input: Record<string, unknown>; offers?: string[] }> = [];
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const handlers: RuntimeHandlers = { onAssistantText: () => undefined, onHook: (hook) => { if (hook.hook_event_name === "SessionStart") started(); }, onPermission: async (request) => { seen.push({ toolName: request.toolName, input: request.input, offers: request.offers }); if (request.toolName === "AskUserQuestion") return { behavior: "allow", updatedInput: { answers: { "question-1": "vault" } } }; if (request.input.reason === "Bloquear rede") return { behavior: "deny", message: "Não ampliar rede" }; if (request.toolName === "extraPermission") return { behavior: "allow", updatedInput: request.input }; return { behavior: "allow", decision: "allow_session" }; }, onExit: () => undefined };
    const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: data.scriptPath };
    const logs: Array<{ event: string; method?: unknown }> = [];
    const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
    const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
    const log = { info: (event: string, fields?: Record<string, string | number | boolean | null>) => logs.push({ event, method: fields?.method }), error: () => undefined };
    const handle = new CodexAppServerRuntime({ process: codexProcess, probe, log }).start({ sessionId: "s1", cwd: data.root, prompt: "Start", contextDir: data.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", handlers });
    await ready;
    const responses = await waitForResponses(data.responsesPath);
    expect(seen.map((request) => request.toolName)).toEqual(["AskUserQuestion", "Bash", "fileChange", "extraPermission", "extraPermission"]);
    expect((seen[2]!.input.diff as string)).toContain("src/a.ts");
    expect(responses).toEqual(expect.arrayContaining([expect.objectContaining({ id: "secret-question", result: { answers: { "question-1": { answers: ["vault"] } } } }), expect.objectContaining({ id: "command-approval", result: { decision: "acceptForSession" } }), expect.objectContaining({ id: "permissions-approval", result: { permissions: { network: { enabled: true } }, scope: "turn" } }), expect.objectContaining({ id: "permissions-denial", result: { permissions: {}, scope: "turn" } })]));
    expect(logs.filter((entry) => entry.event === "codex_request").map((entry) => entry.method)).toEqual(expect.arrayContaining(["item/tool/requestUserInput", "item/commandExecution/requestApproval"]));
    await handle.close();
  });

  it("adds a denial reason to exactly the next turn instead of the approval response", async () => {
    const data = await fixture();
    const denial = { jsonrpc: "2.0", id: "deny-command", method: "item/commandExecution/requestApproval", params: { threadId: "thread-1", turnId: "turn-1", itemId: "item-command", command: "pnpm test", cwd: data.root, reason: "Use a safer command", availableDecisions: ["accept", "decline"] } };
    await writeFile(data.scriptPath, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], recordPath: data.recordPath, serverResponsesPath: data.responsesPath, notificationsByMethod: { "turn/start": [{ jsonrpc: "2.0", method: "turn/completed", params: { threadId: "thread-1" } }] }, serverRequestsByMethodOnce: { "turn/start": [denial] }, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-1" } }, "turn/start": { turn: { id: "turn-1" } } } }));
    const handlers: RuntimeHandlers = { onAssistantText: () => undefined, onHook: () => undefined, onPermission: async () => ({ behavior: "deny", message: "Use a safer command" }), onExit: () => undefined };
    const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: data.scriptPath };
    const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
    const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] }) };
    const handle = new CodexAppServerRuntime({ process: codexProcess, probe, log: { info: () => undefined, error: () => undefined } }).start({ sessionId: "s-denial", cwd: data.root, prompt: "Start", contextDir: data.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", handlers });
    const first = await waitForTurns(data.recordPath, 1);
    handle.push("Next");
    const second = await waitForTurns(data.recordPath, 2);
    handle.push("Another");
    const third = await waitForTurns(data.recordPath, 3);
    expect(first[0]!.params.input[0]!.text).toBe("Start");
    expect(second[1]!.params.input[0]!.text).toContain("Use a safer command");
    expect(third[2]!.params.input[0]!.text).toBe("Another");
    const responses = (await readFile(data.responsesPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { result: unknown });
    expect(responses[0]!.result).toEqual({ decision: "decline" });
    await handle.close();
  });
});
