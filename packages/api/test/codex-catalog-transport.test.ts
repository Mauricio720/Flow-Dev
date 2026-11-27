import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CODEX_FAKE_SCRIPT_VARIABLE } from "../src/infra/terminal/codex/codexProcess";
import { AppServerCodexCatalogTransport, loginStatus } from "../src/infra/terminal/codex/codexCatalogTransport";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "codex-catalog-"));
  roots.push(root);
  const script = join(root, "script.json");
  const record = join(root, "requests.jsonl");
  const envRecord = join(root, "environment.json");
  await writeFile(script, JSON.stringify({ methods: ["initialize", "model/list"], recordPath: record, envRecordPath: envRecord, results: { initialize: {}, "model/list": { data: [{ id: "model-1", displayName: "Model" }] } } }));
  return { root, script, record, envRecord };
}

describe("AppServerCodexCatalogTransport", () => {
  it("recognizes a successful login status written to stderr by the CLI", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-login-status-"));
    roots.push(root);
    const binary = join(root, "codex");
    await writeFile(binary, "#!/bin/sh\nprintf 'Logged in using ChatGPT\\n' >&2\n");
    await chmod(binary, 0o755);
    await expect(loginStatus(binary)).resolves.toBe(true);
  });

  it.each([
    ["is not logged in", "Not logged in", 1],
    ["fails after printing a logged-in message", "Logged in using ChatGPT", 1],
  ])("rejects a CLI that %s", async (_name, message, exitCode) => {
    const root = await mkdtemp(join(tmpdir(), "codex-login-status-"));
    roots.push(root);
    const binary = join(root, "codex");
    await writeFile(binary, `#!/bin/sh\nprintf '${message}\\n' >&2\nexit ${exitCode}\n`);
    await chmod(binary, 0o755);
    await expect(loginStatus(binary)).resolves.toBe(false);
  });

  it("queries model/list through CodexRpcClient and closes its app-server", async () => {
    const files = await fixture();
    const loginStatus = vi.fn(async () => true);
    const transport = new AppServerCodexCatalogTransport({ binary: "/fake/codex", env: { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: files.script }, loginStatus });
    await expect(transport.readCatalog()).resolves.toEqual({ loggedIn: true, models: [{ id: "model-1", displayName: "Model" }] });
    const calls = (await readFile(files.record, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { method: string });
    expect(calls.map((call) => call.method)).toEqual(["initialize", "model/list"]);
    expect(loginStatus).toHaveBeenCalledWith("/fake/codex");
  });

  it("does not launch app-server when the CLI reports no login", async () => {
    const files = await fixture();
    const transport = new AppServerCodexCatalogTransport({ binary: "/fake/codex", env: { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: files.script }, loginStatus: async () => false });
    await expect(transport.readCatalog()).resolves.toEqual({ loggedIn: false, models: [] });
    await expect(readFile(files.record, "utf8")).rejects.toThrow();
  });

  it("uses the selected account home for login status and app-server", async () => {
    const files = await fixture();
    const loginStatus = vi.fn(async (_binary: string, env?: NodeJS.ProcessEnv) => env?.CODEX_HOME === "/accounts/codex-c");
    const transport = new AppServerCodexCatalogTransport({ binary: "/fake/codex", env: { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: files.script }, codexHome: "/accounts/codex-c", loginStatus });
    await expect(transport.readCatalog()).resolves.toMatchObject({ loggedIn: true });
    expect(loginStatus).toHaveBeenCalledWith("/fake/codex", expect.objectContaining({ CODEX_HOME: "/accounts/codex-c" }));
    expect(JSON.parse(await readFile(files.envRecord, "utf8"))).toEqual({ CODEX_HOME: "/accounts/codex-c" });
  });
});
