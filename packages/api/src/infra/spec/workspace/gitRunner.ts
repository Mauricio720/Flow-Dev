import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskError } from "../../../application/services/tasks/taskErrors";
import type { GitCredential } from "../../../application/spec/specWorkspaceGateway";

export type GitInvocation = { args: string[]; cwd?: string; credential?: GitCredential; timeoutMs: number };
export type GitResult = { stdout: string };
export type GitRunner = (invocation: GitInvocation) => Promise<GitResult>;
export type SpawnRecord = { command: string; args: string[]; env: Record<string, string> };

const CREDENTIAL_HELPER = "!f() { test \"$1\" = get && cat <&3; }; f";
const CREDENTIAL_FD_INDEX = 3;
const HARDENING_ARGS = ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "protocol.ext.allow=never", "-c", "submodule.recurse=false", "-c", "filter.lfs.smudge=", "-c", "filter.lfs.process=", "-c", "filter.lfs.required=false", "-c", "credential.helper="];

export function createGitRunner(recorder?: (record: SpawnRecord) => void): GitRunner {
  return async (invocation) => {
    const home = await mkdtemp(join(tmpdir(), "spec-git-home-"));
    try { return await execute(invocation, home, recorder); }
    finally { await rm(home, { recursive: true, force: true }); }
  };
}

function execute(invocation: GitInvocation, home: string, recorder?: (record: SpawnRecord) => void): Promise<GitResult> {
  const env = { PATH: process.env.PATH ?? "", HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "", GIT_LFS_SKIP_SMUDGE: "1", LC_ALL: "C" };
  const helper = invocation.credential ? ["-c", `credential.helper=${CREDENTIAL_HELPER}`] : [];
  const args = [...HARDENING_ARGS, ...helper, ...invocation.args];
  recorder?.({ command: "git", args, env });
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd: invocation.cwd, env, stdio: ["ignore", "pipe", "pipe", "pipe"], timeout: invocation.timeoutMs });
    const output: Buffer[] = [];
    child.stdout!.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr!.resume();
    feedCredential(child, invocation.credential);
    child.on("error", () => reject(new TaskError("workspace_unavailable")));
    child.on("close", (code, signal) => {
      if (signal) return reject(new TaskError("resource_limit"));
      if (code !== 0) return reject(new TaskError("workspace_unavailable"));
      resolve({ stdout: Buffer.concat(output).toString("utf8").trim() });
    });
  });
}

function feedCredential(child: ReturnType<typeof spawn>, credential?: GitCredential) {
  const pipe = child.stdio[CREDENTIAL_FD_INDEX] as NodeJS.WritableStream | null;
  if (!pipe) return;
  pipe.on("error", () => undefined);
  pipe.end(credential ? `username=${credential.username}\npassword=${credential.password}\n\n` : "");
}
