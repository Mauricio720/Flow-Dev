import { access, appendFile, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import type { RpcMessage } from "../../src/infra/terminal/codex/codexRpcFrames";
import { fragments, framed, readRpcScript } from "./codexRpcScript";

const scriptPath = process.argv[2];
if (process.env.NODE_ENV !== "test" || !scriptPath) process.exit(2);
const script = readRpcScript(await readFile(scriptPath, "utf8"));
const recordedNames = script.envRecordNames ?? ["CODEX_HOME"];
if (script.envRecordPath) await writeFile(script.envRecordPath, JSON.stringify(Object.fromEntries(recordedNames.map((name) => [name, process.env[name] ?? null]))));
if (script.childPidPath) {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  await writeFile(script.childPidPath, String(child.pid));
}
const input = createInterface({ input: process.stdin });
const requests = new Map<string, RpcMessage>();
let notificationSent = false;
let serverRequestSent = false;
const oneShotRequestsSent = new Set<string>();
input.on("line", (line) => void receive(line));

async function receive(line: string) {
  const message = JSON.parse(line) as RpcMessage;
  if (message.method && message.id !== undefined && script.recordPath) await appendFile(script.recordPath, `${line}\n`);
  if (message.method && message.id !== undefined) await handleRequest(message);
  if (!message.method && typeof message.id === "string" && script.serverResponsesPath) await appendFile(script.serverResponsesPath, `${line}\n`);
  if (message.method === undefined && typeof message.id === "string" && message.result === true) process.exit(0);
}

async function handleRequest(message: RpcMessage) {
  const method = message.method!;
  if (method === "thread/unsubscribe") { process.stdout.write(framed({ jsonrpc: "2.0", id: message.id, result: true })); return; }
  if (script.eofMethods?.includes(method)) { process.stdout.end(); process.exit(0); }
  if (method === "turn/start" && script.waitForPath) await waitForRelease(script.waitForPath);
  requests.set(method, message);
  if (script.batch && !script.methods.every((name) => requests.has(name))) return;
  if (!script.batch) { writeResponses([method]); return exitAfter(method); }
  writeResponses(script.order ?? script.methods);
  exitAfter(method);
}

function exitAfter(method: string) {
  if (script.exitAfterMethods?.includes(method)) setTimeout(() => process.exit(0), 10);
}

async function waitForRelease(path: string) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (await access(path).then(() => true, () => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Codex RPC test wait expired");
}

function writeResponses(order: string[]) {
  if (script.notification && !notificationSent) { process.stdout.write(framed(script.notification)); notificationSent = true; }
  for (const method of order) {
    if (script.serverRequest && !serverRequestSent) { process.stdout.write(framed(script.serverRequest)); serverRequestSent = true; }
    for (const notification of script.notificationsByMethod?.[method] ?? []) process.stdout.write(framed(notification));
    for (const request of script.serverRequestsByMethod?.[method] ?? []) process.stdout.write(framed(request));
    if (!oneShotRequestsSent.has(method)) {
      for (const request of script.serverRequestsByMethodOnce?.[method] ?? []) process.stdout.write(framed(request));
      oneShotRequestsSent.add(method);
    }
  }
  const output = order.map((name) => framed({ jsonrpc: "2.0", id: requests.get(name)!.id, result: script.errors?.[name] ? undefined : script.results[name], error: script.errors?.[name] })).join("");
  for (const chunk of fragments(output)) process.stdout.write(chunk);
}
