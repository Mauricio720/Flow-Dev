import { execFile } from "node:child_process";

export const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER_BYTES = 1024 * 1024;
const GIT_FIXED_ARGUMENTS = ["-c", "core.fsmonitor=false"];

export type GitResult = { ok: true; stdout: string } | { ok: false };

export function runGit(directory: string, args: string[]): Promise<GitResult> {
  const options = { timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER_BYTES, shell: false, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" } };
  return new Promise((resolve) => {
    execFile("git", [...GIT_FIXED_ARGUMENTS, "-C", directory, ...args], options, (error, stdout) => {
      resolve(error ? { ok: false } : { ok: true, stdout: String(stdout) });
    });
  });
}
