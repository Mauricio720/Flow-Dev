import { execFile as execFileCallback, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { localProviderLines } from "./localProviderOverlay";

const execFile = promisify(execFileCallback);
const FILTER_SCRIPT = join(process.cwd(), "runtime/acp/claudeModelFilter.mjs");
const REJECTED_MODEL = "plan-locked-model";
const FLAKY_MODEL = "flaky-model";
const FAKE_AGENT = `
import { createInterface } from "node:readline";
let flakyCalls = 0;
const options = ["usable-model", "${FLAKY_MODEL}", "${REJECTED_MODEL}"].map((value) => ({ value, name: value }));
const configOptions = [{ id: "model", category: "model", currentValue: "usable-model", options }];
const reply = (id, body) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...body }) + "\\n");
createInterface({ input: process.stdin }).on("line", (line) => {
  const { id, method, params } = JSON.parse(line);
  if (method === "initialize") return reply(id, { result: { protocolVersion: 1 } });
  if (method === "session/new") return reply(id, { result: { sessionId: "s1", configOptions } });
  if (params.value === "${REJECTED_MODEL}" || (params.value === "${FLAKY_MODEL}" && (flakyCalls += 1) === 1)) return reply(id, { error: { code: -32603, message: "Internal error" } });
  reply(id, { result: { configOptions } });
});
`;

let directory: string;
let agentPath: string;
let cachePath: string;

async function advertisedModels() {
  const proxy = spawn(process.execPath, [FILTER_SCRIPT, cachePath, process.execPath, agentPath], { stdio: ["pipe", "pipe", "ignore"] });
  const lines = createInterface({ input: proxy.stdout });
  const answers = new Promise<string[]>((resolve) => lines.on("line", (line) => {
    const message = JSON.parse(line) as { id: number; result: { configOptions: { options: { value: string }[] }[] } };
    if (message.id === 2) resolve(message.result.configOptions[0]!.options.map((option) => option.value));
  }));
  proxy.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`);
  proxy.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "session/new", params: {} })}\n`);
  const models = await answers;
  proxy.kill();
  return models;
}

describe("local provider overlay", () => {
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "flow-model-filter-"));
    agentPath = join(directory, "agent.mjs");
    cachePath = join(directory, "cache", "filter.json");
    await writeFile(agentPath, FAKE_AGENT);
  });

  afterEach(() => rm(directory, { recursive: true, force: true }));

  it("wraps only the Claude agent with the model filter and a longer discovery budget", () => {
    const claude = localProviderLines({ id: "claude", kind: "claude", runtimeRoot: "/runtime root" }).join("\n");
    expect(claude).toContain("claudeModelFilter.mjs' '/runtime root/claude-model-filter.json' npx -y @agentclientprotocol/claude-agent-acp");
    expect(claude).toContain('[providers.claude.models.discovery]\ntimeout = "90s"');
    const codex = localProviderLines({ id: "codex", kind: "codex", runtimeRoot: "/runtime root" }).join("\n");
    expect(codex).not.toContain("claudeModelFilter");
    expect(codex).not.toContain("models.discovery");
  });

  it("advertises every model until the account check has run", async () => {
    expect(await advertisedModels()).toEqual(["usable-model", FLAKY_MODEL, REJECTED_MODEL]);
  });

  it("hides only the models the account rejects twice once the cache is warm", async () => {
    await execFile(process.execPath, [FILTER_SCRIPT, "--warm", cachePath, process.execPath, agentPath]);
    expect(JSON.parse(await readFile(cachePath, "utf8"))).toMatchObject({ blocked: [REJECTED_MODEL] });
    expect(await advertisedModels()).toEqual(["usable-model", FLAKY_MODEL]);
  });
});
