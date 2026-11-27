import { readFile, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { codexLogSink, scriptedCodexRuntime } from "./support/codexRuntimeHarness";
import { callbacks, cleanupCodexFolders, setup, waitForRecordedTurn } from "./support/codexRuntimeFixture";

afterEach(cleanupCodexFolders);

describe("CodexAppServerRuntime.start", () => {
  it("V-49a sends roots, choice, policy, skill and local image before starting the turn", async () => {
    const files = await setup();
    const observed = callbacks();
    const sink = codexLogSink();
    const handle = scriptedCodexRuntime(files.scriptPath, sink).start({ sessionId: "session-1", cwd: files.root, prompt: `/flow-dev:spec-writer Escreva a spec\n\n- issue (image/png): ${files.image}`, contextDir: files.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", credentialHome: "/accounts/codex-b", handlers: observed.handlers });
    await Promise.race([observed.started, observed.onExit.then((outcome) => { throw new Error(`Codex exited early: ${JSON.stringify(outcome)}`); })]);
    await waitForRecordedTurn(files.recordPath);
    await sink.logged("codex_turn_started");
    await handle.close();
    await expect(observed.onExit).resolves.toMatchObject({ kind: "ended" });
    expect(sink.entries).toContainEqual(expect.objectContaining({ event: "codex_app_server_started", agent: "codex", version: "0.159.3", pid: expect.any(Number) }));
    expect(sink.entries).toContainEqual(expect.objectContaining({ event: "codex_turn_started", requestUserInput: true }));
    expect(sink.entries).toContainEqual(expect.objectContaining({ event: "codex_app_server_exited", signal: "SIGTERM" }));
    expect(JSON.parse(await readFile(files.envRecordPath, "utf8"))).toEqual({ CODEX_HOME: "/accounts/codex-b" });
    expect(JSON.stringify(sink.entries)).not.toContain("Escreva a spec");
    const requests = (await readFile(files.recordPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { method: string; params: Record<string, unknown> });
    expect(requests.map((item) => item.method)).toEqual(["initialize", "skills/extraRoots/set", "thread/start", "turn/start", "thread/unsubscribe"]);
    expect(requests[1]!.params.extraRoots).toEqual([`${files.contextDir}/skills`]);
    expect(requests[2]!.params).toMatchObject({ cwd: files.root, model: "model-1", approvalPolicy: "untrusted", sandbox: "workspace-write", ephemeral: false });
    expect(requests[3]!.params.input).toEqual([{ type: "skill", name: "spec-writer", path: `${files.contextDir}/skills/spec-writer/SKILL.md` }, { type: "text", text: "Escreva a spec\n", text_elements: [] }, { type: "localImage", path: files.image }]);
    expect(observed.hooks).toContainEqual(expect.objectContaining({ hook_event_name: "SessionStart", session_id: "thread-1" }));
    expect(observed.hooks).toContainEqual(expect.objectContaining({ hook_event_name: "UserPromptSubmit", prompt: "[spec-writer] Escreva a spec\n" }));
    expect(observed.messages).toEqual(["spec pronta"]);
    expect(observed.hooks).toContainEqual(expect.objectContaining({ hook_event_name: "Stop", session_id: "thread-1" }));
  });
  it("V-49g reports a rejected model before starting a turn", async () => {
    const files = await setup();
    await writeFile(files.scriptPath, JSON.stringify({ methods: ["initialize", "skills/extraRoots/set", "thread/start"], recordPath: files.recordPath, errors: { "thread/start": { code: -32602, message: "model limit reached" } }, results: { initialize: {}, "skills/extraRoots/set": {} } }));
    const observed = callbacks();
    scriptedCodexRuntime(files.scriptPath).start({ sessionId: "session-2", cwd: files.root, prompt: "Start", contextDir: files.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", handlers: observed.handlers });
    await expect(observed.onExit).resolves.toMatchObject({ kind: "failed", detail: "Codex RPC thread/start: model limit reached" });
    const requests = (await readFile(files.recordPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { method: string });
    expect(requests.map((item) => item.method)).toEqual(["initialize", "skills/extraRoots/set", "thread/start"]);
  });
  it("V-49a gives concurrent sessions separate app-server processes", async () => {
    const first = await setup();
    const second = await setup();
    const left = callbacks();
    const right = callbacks();
    const leftSink = codexLogSink();
    const rightSink = codexLogSink();
    const leftHandle = scriptedCodexRuntime(first.scriptPath, leftSink).start({ sessionId: "left", cwd: first.root, prompt: "left", contextDir: first.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", handlers: left.handlers });
    const rightHandle = scriptedCodexRuntime(second.scriptPath, rightSink).start({ sessionId: "right", cwd: second.root, prompt: "right", contextDir: second.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", handlers: right.handlers });
    await Promise.all([left.started, right.started, waitForRecordedTurn(first.recordPath), waitForRecordedTurn(second.recordPath)]);
    expect(leftSink.entries[0]!.pid).not.toBe(rightSink.entries[0]!.pid);
    await Promise.all([leftHandle.close(), rightHandle.close()]);
  });
});
