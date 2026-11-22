import { afterEach, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAKE_CLI } from "../../../test/fixtures/agents/fakeCliPath";
import { AgentRunError } from "../../application/agents/localAgentRunner";
import { withAgentDirectory } from "./agentDirectory";
import { runAgentProcess, type ProcessSpec } from "./agentProcess";

export const SHORT_GRACE_MS = 100;
export const GROUP_GONE_LIMIT_MS = 5000;

export function alive(pid: number) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function run(scenario: object, overrides: Partial<ProcessSpec> = {}) {
  return withAgentDirectory(async (directory) => {
    const spec: ProcessSpec = { label: "Fake CLI", command: FAKE_CLI, args: [], env: { PATH: process.env.PATH ?? "" }, cwd: directory, stdin: JSON.stringify(scenario), timeoutMs: 10000, signal: new AbortController().signal, ...overrides };
    return runAgentProcess(spec);
  });
}

export async function expectFailure(promise: Promise<unknown>, failure: string) {
  const error = await promise.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(AgentRunError);
  expect((error as AgentRunError).failure).toBe(failure);
}

const pidFiles: string[] = [];

export function pidFilePath(name: string) {
  const file = join(mkdtempSync(join(tmpdir(), "fake-pids-")), name);
  pidFiles.push(file);
  return file;
}

export function registerPidCleanup() {
  afterEach(() => {
    for (const file of pidFiles.splice(0)) {
      if (!existsSync(file)) continue;
      const { pid, child } = JSON.parse(readFileSync(file, "utf8"));
      for (const id of [pid, child]) if (id && alive(id)) process.kill(id, "SIGKILL");
    }
  });
}

export async function pidsFrom(file: string) {
  for (let attempt = 0; attempt < 50 && !existsSync(file); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  return JSON.parse(readFileSync(file, "utf8")) as { pid: number; child: number | null };
}

