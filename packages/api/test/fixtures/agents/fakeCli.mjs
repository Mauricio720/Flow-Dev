#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

if (process.argv.includes("--version")) {
  process.stdout.write("fake 1.0.0\n");
  process.exit(0);
}

const SCENARIO_MARKER = '{"mode"';
const stdin = readFileSync(0, "utf8");
const inputFormat = process.argv.includes("--input-format") ? process.argv[process.argv.indexOf("--input-format") + 1] : "";
const message = inputFormat === "stream-json" ? JSON.parse(stdin.trim()).message.content : [];
const textBlock = message.find((block) => block.type === "text")?.text;
const line = inputFormat === "stream-json" ? textBlock : stdin.split("\n").find((entry) => entry.startsWith(SCENARIO_MARKER));
const scenario = line ? JSON.parse(line) : { mode: "echo" };
const streamImages = message.filter((block) => block.type === "image").map((block) => ({ media_type: block.source.media_type, data: block.source.data }));
const isCodex = process.argv[2] === "exec" || process.argv.includes("exec");
const imagePaths = process.argv.flatMap((argument, index) => argument === "--image" ? [process.argv[index + 1]] : []);

function emitStructured(value) {
  if (!isCodex && inputFormat === "stream-json") return process.stdout.write(`${JSON.stringify({ type: "system" })}\n${JSON.stringify({ type: "assistant" })}\n${JSON.stringify({ type: "result", is_error: false, structured_output: value })}\n`);
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
  const imageFiles = imagePaths.map((path) => ({ path, data: readFileSync(path).toString("base64") }));
  emitStructured({ args: process.argv.slice(2), env: process.env, cwd: process.cwd(), cwdFiles: readdirSync(process.cwd()), executionFiles: readdirSync(dirname(process.cwd())), imageFiles, stdin, streamImages, mcp, codexHomeFiles: codexHome ? readdirSync(codexHome) : null });
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
  fail: () => { if (scenario.cwdFile) writeFileSync(scenario.cwdFile, JSON.stringify({ cwd: process.cwd(), imagePaths })); process.stderr.write(scenario.stderr ?? "boom"); process.exit(scenario.exitCode ?? 3); },
  version: () => process.stdout.write("fake 1.0.0\n"),
};

modes[scenario.mode]();
