import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import type { RpcMessage } from "../src/infra/terminal/codex/codexRpcFrames";
import { codexLogSink, scriptedCodexRuntime } from "./support/codexRuntimeHarness";
import { callbacks, cleanupCodexFolders, setup, waitForRecordedTurn, writeTurnScript, type CodexFiles } from "./support/codexRuntimeFixture";

afterEach(cleanupCodexFolders);

const AGENT_SOCKET = "/tmp/flow-dev-agent.sock";
const RECORDED_NAMES = ["CODEX_HOME", "SSH_AUTH_SOCK"];
const ACCOUNT_HOME = "/accounts/codex-b";
const turnError = (message: string, codexErrorInfo: string | null) => ({ message, codexErrorInfo, additionalDetails: null });
const errorNotification = (message: string, codexErrorInfo: string | null, willRetry = false): RpcMessage => ({ jsonrpc: "2.0", method: "error", params: { threadId: "thread-1", turnId: "turn-1", willRetry, error: turnError(message, codexErrorInfo) } });
const LATER_TEXT = "continua aberta";
const laterMessage: RpcMessage = { jsonrpc: "2.0", method: "item/completed", params: { threadId: "thread-1", item: { type: "agentMessage", text: LATER_TEXT } } };
const failedTurn = (message: string, codexErrorInfo: string | null): RpcMessage => ({ jsonrpc: "2.0", method: "turn/completed", params: { threadId: "thread-1", turn: { id: "turn-1", status: "failed", error: turnError(message, codexErrorInfo) } } });

function startTurn(files: CodexFiles, credentialHome?: string) {
  const observed = callbacks();
  const runtime = scriptedCodexRuntime(files.scriptPath, codexLogSink(), { SSH_AUTH_SOCK: AGENT_SOCKET });
  const handle = runtime.start({ sessionId: "session-1", cwd: files.root, prompt: "Start", contextDir: files.contextDir, permissionMode: "ask_all", model: "model-1", effort: "high", credentialHome, handlers: observed.handlers });
  return { observed, handle };
}

async function recordedEnvironment(files: CodexFiles, credentialHome?: string) {
  await writeTurnScript(files, [], RECORDED_NAMES);
  const { handle } = startTurn(files, credentialHome);
  await waitForRecordedTurn(files.recordPath);
  await handle.close();
  return JSON.parse(await readFile(files.envRecordPath, "utf8"));
}

describe("Codex app-server with an AI account", () => {
  it("V-06c changes only CODEX_HOME and keeps the rest of the server environment", async () => {
    expect(await recordedEnvironment(await setup())).toEqual({ CODEX_HOME: process.env.CODEX_HOME ?? null, SSH_AUTH_SOCK: AGENT_SOCKET });
    expect(await recordedEnvironment(await setup(), ACCOUNT_HOME)).toEqual({ CODEX_HOME: ACCOUNT_HOME, SSH_AUTH_SOCK: AGENT_SOCKET });
  });

  it("V-07d ends the turn as a usage limit from the final error notification", async () => {
    const files = await setup();
    await writeTurnScript(files, [errorNotification("Quota reached for this plan.", "usageLimitExceeded"), failedTurn("Quota reached for this plan.", "usageLimitExceeded")]);
    const { observed } = startTurn(files, ACCOUNT_HOME);
    await expect(observed.onExit).resolves.toEqual({ kind: "crashed", detail: "Quota reached for this plan.", limit: true });
  });

  it("V-07d ends the turn as a usage limit from a failed turn/completed", async () => {
    const files = await setup();
    await writeTurnScript(files, [failedTurn("You've hit your usage limit.", "usageLimitExceeded")]);
    const { observed } = startTurn(files, ACCOUNT_HOME);
    await expect(observed.onExit).resolves.toMatchObject({ kind: "crashed", limit: true });
  });

  it("keeps the session open for a retried error and for a failed turn that is not a usage limit", async () => {
    const files = await setup();
    await writeTurnScript(files, [errorNotification("Reconnecting", "usageLimitExceeded", true), failedTurn("Server overloaded", "serverOverloaded"), laterMessage]);
    const { observed, handle } = startTurn(files, ACCOUNT_HOME);
    await expect.poll(() => observed.messages).toContain(LATER_TEXT);
    await handle.close();
    await expect(observed.onExit).resolves.toEqual({ kind: "ended" });
  });
});
