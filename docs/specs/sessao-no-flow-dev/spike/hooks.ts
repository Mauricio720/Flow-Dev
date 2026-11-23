import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { HookCallbackMatcher, HookEvent } from "@anthropic-ai/claude-agent-sdk";
import { BYPASS, OUT_DIR, Session, baseOptions, makePlugin, makeRepo, sleep, verdict, type Log } from "./lib";

const FIXTURES_DIR = join(import.meta.dirname, "..", "..", "..", "..", "packages", "api", "test", "fixtures", "terminal-hooks");
const EVENTS: HookEvent[] = ["SessionStart", "UserPromptSubmit", "PostToolUse", "Stop", "Notification", "SessionEnd"];
const IDLE_OBSERVATION_MS = 75_000;
const READ_FIELDS = ["hook_event_name", "session_id", "prompt", "tool_name", "tool_input", "message", "reason"];
const TOOL_INPUT_FIELDS = ["file_path", "command", "skill"];

type Payload = Record<string, unknown>;

function loadFixtures(): Payload[] {
  return readdirSync(FIXTURES_DIR).map((file) => JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf8")) as Payload);
}

function fieldTypes(payload: Payload) {
  const types: Record<string, string> = {};
  for (const field of READ_FIELDS) if (field in payload) types[field] = typeof payload[field];
  const toolInput = payload.tool_input as Payload | undefined;
  for (const field of TOOL_INPUT_FIELDS) if (toolInput && field in toolInput) types[`tool_input.${field}`] = typeof toolInput[field];
  return types;
}

function compare(observed: Payload[], fixtures: Payload[], log: Log) {
  const mismatches: string[] = [];
  for (const payload of observed) {
    const sample = fixtures.find((fixture) => fixture.hook_event_name === payload.hook_event_name && fixture.tool_name === payload.tool_name) ?? fixtures.find((fixture) => fixture.hook_event_name === payload.hook_event_name);
    if (!sample) {
      mismatches.push(`${String(payload.hook_event_name)}: sem fixture`);
      continue;
    }
    const expected = fieldTypes(sample);
    const actual = fieldTypes(payload);
    for (const [field, type] of Object.entries(expected)) if (actual[field] !== type) mismatches.push(`${String(payload.hook_event_name)}.${field}: fixture=${type} observado=${actual[field] ?? "ausente"}`);
  }
  log.json("COMPARACAO", { mismatches });
  return mismatches;
}

function buildHooks(observed: Payload[], log: Log) {
  const hooks: Partial<Record<HookEvent, HookCallbackMatcher[]>> = {};
  for (const event of EVENTS) {
    hooks[event] = [{ hooks: [async (input) => {
      observed.push(input as unknown as Payload);
      log.json(`HOOK ${event}`, input);
      return {};
    }] }];
  }
  return hooks;
}

async function bypassPhase(repo: string, observed: Payload[], log: Log) {
  const contextDir = await makePlugin();
  const options = baseOptions(repo, { ...BYPASS, includeHookEvents: true, plugins: [{ type: "local", path: contextDir }], hooks: buildHooks(observed, log) });
  const session = new Session(options, log);
  await session.turn("/flow-dev:direct-executor Não implemente nada. Crie o arquivo docs/nota.md com a palavra oi usando a ferramenta Write, rode `echo fim` com a ferramenta Bash e pare.");
  log.line(`observando ${IDLE_OBSERVATION_MS / 1_000}s de ociosidade para o Notification`);
  await sleep(IDLE_OBSERVATION_MS);
  await session.close();
  await sleep(2_000);
}

async function permissionPhase(repo: string, observed: Payload[], log: Log) {
  const options = baseOptions(repo, { permissionMode: "acceptEdits", includeHookEvents: true, hooks: buildHooks(observed, log), canUseTool: async (_tool, input) => ({ behavior: "allow", updatedInput: input }) });
  const session = new Session(options, log);
  await session.turn("Rode `pnpm --version` com a ferramenta Bash e pare.");
  session.query.close();
  await Promise.race([session.finished, sleep(10_000)]);
  await sleep(2_000);
}

export async function runHooks(log: Log) {
  const repo = await makeRepo();
  const observed: Payload[] = [];
  await bypassPhase(repo, observed, log);
  await permissionPhase(repo, observed, log);
  writeFileSync(join(OUT_DIR, "hooks-payloads.json"), JSON.stringify(observed, null, 2));
  const seen = new Set(observed.map((payload) => String(payload.hook_event_name)));
  const missing = EVENTS.filter((event) => !seen.has(event));
  const mismatches = compare(observed, loadFixtures(), log);
  verdict(log, "V-20h", missing.length === 0 && mismatches.length === 0, `eventos vistos=${[...seen].join(",")}; ausentes=${missing.join(",") || "nenhum"}; divergências de campo=${mismatches.length ? mismatches.join("; ") : "nenhuma"}`);
}
