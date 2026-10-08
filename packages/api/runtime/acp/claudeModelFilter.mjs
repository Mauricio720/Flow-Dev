#!/usr/bin/env node
// ACP proxy for the Claude agent. CompozyOS inspects every advertised model before it lists a catalog or
// creates a session, within a few seconds, and one model the signed-in plan cannot use (HTTP 429 on a
// subscription) fails the whole provider. This proxy learns which models the account accepts from a
// session of its own (no prompt is sent), caches the answer on disk and hides the rest from the client.
// Usage: claudeModelFilter.mjs [--warm] <cache file> <agent command> [agent args...]
// With --warm it only refreshes the cache and exits, so the first inspection already sees a filtered list.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

const PROBE_PREFIX = "model-filter-";
const MODEL_OPTION = "model";
const NEW_SESSION_METHOD = "session/new";
const SET_OPTION_METHOD = "session/set_config_option";
const CACHE_FRESH_MS = 10 * 60 * 1000;

const WARM_FLAG = "--warm";
const INITIALIZE_REQUEST = { protocolVersion: 1, clientCapabilities: {} };

const warming = process.argv[2] === WARM_FLAG;
const [cachePath, command, ...commandArgs] = process.argv.slice(warming ? 3 : 2);
const cached = readCache();
const fresh = !!cached && Date.now() - cached.checkedAt < CACHE_FRESH_MS;
if (warming && fresh) process.exit(0);
const agent = spawn(command, commandArgs, { stdio: ["pipe", "pipe", warming ? "ignore" : "inherit"] });
const probes = new Map();
let blocked = new Set(cached?.blocked ?? []);
let probing = fresh;
let probeCount = 0;

const parse = (line) => { try { return JSON.parse(line); } catch { return null; } };
const send = (stream, message) => stream.write(`${JSON.stringify(message)}\n`);
const modelOptionOf = (result) => result?.configOptions?.find((option) => option.id === MODEL_OPTION || option.category === MODEL_OPTION);
const valuesOf = (option) => (option.options ?? []).flatMap((entry) => entry.options ?? [entry]).map((entry) => entry.value);
const isBlockedEntry = (entry) => !!entry && typeof entry === "object" && (blocked.has(entry.value) || blocked.has(entry.modelId));

function readCache() {
  try { return JSON.parse(readFileSync(cachePath, "utf8")); } catch { return null; }
}

function writeCache(models) {
  const pending = `${cachePath}.${process.pid}`;
  mkdirSync(dirname(cachePath), { recursive: true, mode: 0o700 });
  writeFileSync(pending, JSON.stringify({ checkedAt: Date.now(), blocked: [...models] }), { mode: 0o600 });
  renameSync(pending, cachePath);
}

function askAgent(method, params) {
  return new Promise((resolve) => {
    const id = `${PROBE_PREFIX}${(probeCount += 1)}`;
    probes.set(id, resolve);
    send(agent.stdin, { jsonrpc: "2.0", id, method, params });
  });
}

async function refreshBlockedModels() {
  const { result } = await askAgent(NEW_SESSION_METHOD, { cwd: process.cwd(), mcpServers: [] });
  const option = modelOptionOf(result);
  if (!option) return;
  const select = (value) => askAgent(SET_OPTION_METHOD, { sessionId: result.sessionId, configId: option.id, value });
  const values = valuesOf(option);
  const answers = await Promise.all(values.map(select));
  const rejected = [];
  for (const value of values.filter((_, index) => answers[index].error)) if ((await select(value)).error) rejected.push(value);
  blocked = new Set(rejected);
  writeCache(blocked);
}

function withoutBlocked(node) {
  if (Array.isArray(node)) return node.filter((entry) => !isBlockedEntry(entry)).map(withoutBlocked);
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, withoutBlocked(value)]));
}

function forward(line, message) {
  if (warming) return;
  if (!message) return void process.stdout.write(`${line}\n`);
  send(process.stdout, blocked.size ? withoutBlocked(message) : message);
  if (probing || message.result?.protocolVersion === undefined) return;
  probing = true;
  refreshBlockedModels().catch(() => undefined);
}

createInterface({ input: agent.stdout }).on("line", (line) => {
  const message = parse(line);
  const probe = probes.get(message?.id);
  if (!probe) return forward(line, message);
  probes.delete(message.id);
  probe(message);
});
agent.on("exit", (code) => process.exit(code ?? 1));
if (warming) askAgent("initialize", INITIALIZE_REQUEST).then(refreshBlockedModels).finally(() => { agent.kill("SIGTERM"); process.exit(0); });
else process.stdin.pipe(agent.stdin);
process.on("SIGTERM", () => agent.kill("SIGTERM"));
