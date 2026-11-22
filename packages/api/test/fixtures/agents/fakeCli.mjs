#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

if (process.argv.includes("--version")) {
  process.stdout.write("fake 1.0.0\n");
  process.exit(0);
}

const SCENARIO_MARKER = '{"mode"';
const stdin = readFileSync(0, "utf8");
const line = stdin.split("\n").find((entry) => entry.startsWith(SCENARIO_MARKER));
const scenario = line ? JSON.parse(line) : { mode: "echo" };
const isCodex = process.argv[2] === "exec" || process.argv.includes("exec");

function emitStructured(value) {
  if (!isCodex) return process.stdout.write(JSON.stringify({ type: "result", is_error: false, structured_output: value }));
  const text = JSON.stringify(value);
  process.stdout.write(`${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text } })}\n${JSON.stringify({ type: "turn.completed" })}\n`);
}

function recordPids() {
  if (scenario.pidFile) writeFileSync(scenario.pidFile, JSON.stringify({ pid: process.pid, child: globalThis.childPid ?? null }));
}

function replayFixture() {
  const raw = readFileSync(scenario.file, "utf8");
  if (scenario.file.endsWith(".jsonl")) process.stdout.write(raw);
  else {
    const wrapped = JSON.parse(raw);
    process.stdout.write(wrapped.stdout);
    process.stderr.write(wrapped.stderr ?? "");
    process.exit(wrapped.exitCode);
  }
  process.stderr.write(scenario.stderr ?? "");
  process.exit(scenario.exitCode ?? 0);
}

function dump() {
  const mcp = process.argv.includes("--mcp-config") ? readFileSync(process.argv[process.argv.indexOf("--mcp-config") + 1], "utf8") : null;
  const codexHome = process.env.CODEX_HOME;
  emitStructured({ args: process.argv.slice(2), env: process.env, cwd: process.cwd(), cwdFiles: readdirSync(process.cwd()), stdin, mcp, codexHomeFiles: codexHome ? readdirSync(codexHome) : null });
}

const modes = {
  fixture: replayFixture,
  echo: () => emitStructured({ ok: true }),
  dump,
  sleep: () => { recordPids(); setTimeout(() => process.exit(0), scenario.ms); },
  child: () => { globalThis.childPid = spawn("sleep", ["60"], { stdio: "ignore" }).pid; recordPids(); setTimeout(() => process.exit(0), 60000); },
  hang: () => { emitStructured(scenario.value ?? { ok: true }); recordPids(); setTimeout(() => process.exit(0), 60000); },
  raw: () => { process.stdout.write(scenario.stdout); process.exit(scenario.exitCode ?? 0); },
  big: () => process.stdout.write("x".repeat(scenario.bytes ?? 300 * 1024)),
  fail: () => { process.stderr.write(scenario.stderr ?? "boom"); process.exit(scenario.exitCode ?? 3); },
  version: () => process.stdout.write("fake 1.0.0\n"),
};

modes[scenario.mode]();
