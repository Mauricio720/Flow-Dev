import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../src/infra/terminal/codex/codexProcess";
import { CodexRpcClient } from "../src/infra/terminal/codex/codexRpcClient";

const folders: string[] = [];
afterEach(async () => Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))));

async function script(value: object) {
  const folder = await mkdtemp(join(tmpdir(), "codex-rpc-"));
  folders.push(folder);
  const path = join(folder, "script.json");
  await writeFile(path, JSON.stringify(value));
  return path;
}

function testProcess(path: string) {
  const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: path };
  return new CodexProcess({ locate: async () => null, has: async () => false }, env);
}

describe("CodexRpcClient", () => {
  it("V-49h correlates concurrent out-of-order responses, notifications and server requests over fragmented frames", async () => {
    const file = await script({ methods: ["alpha", "beta"], order: ["beta", "alpha"], results: { alpha: "A", beta: "B" }, notification: { jsonrpc: "2.0", method: "thread/started", params: { threadId: "t1" } }, serverRequest: { jsonrpc: "2.0", id: "server-1", method: "item/tool/requestUserInput", params: { itemId: "i1" } } });
    const process = testProcess(file);
    const child = await process.start();
    const rpc = new CodexRpcClient(child);
    const notifications: string[] = [];
    const serverRequests: string[] = [];
    const remove = rpc.onNotification((method) => notifications.push(method));
    rpc.onServerRequest(async ({ method }) => { serverRequests.push(method); return method === "item/tool/requestUserInput"; });
    try {
      const [alpha, beta] = await Promise.all([rpc.request<string>("alpha"), rpc.request<string>("beta")]);
      expect([alpha, beta]).toEqual(["A", "B"]);
      expect(notifications).toEqual(["thread/started"]);
      expect(serverRequests).toEqual(["item/tool/requestUserInput"]);
    } finally { remove(); rpc.close(); await process.terminate(child); }
  });

  it("V-49h rejects every pending method with its name when the real child closes at EOF", async () => {
    const file = await script({ methods: [], results: {}, eofMethods: ["hang"] });
    const process = testProcess(file);
    const child = await process.start();
    const rpc = new CodexRpcClient(child);
    await expect(rpc.request("hang")).rejects.toThrow("Codex RPC hang");
    rpc.close();
    await process.terminate(child);
  });

  it("V-49h includes the request method in JSON-RPC errors and never enables the fake outside tests", async () => {
    const file = await script({ methods: ["refused"], results: {}, errors: { refused: { code: -32602, message: "bad params" } } });
    const process = testProcess(file);
    const child = await process.start();
    const rpc = new CodexRpcClient(child);
    await expect(rpc.request("refused")).rejects.toThrow("Codex RPC refused: bad params");
    rpc.close();
    await process.terminate(child);
    const fakeEnv = { NODE_ENV: "production", [CODEX_FAKE_SCRIPT_VARIABLE]: file };
    const production = new CodexProcess({ locate: async () => null, has: async () => false }, fakeEnv);
    await expect(production.start()).rejects.toThrow(`${CODEX_FAKE_SCRIPT_VARIABLE} is restricted to NODE_ENV=test`);
  });
});
