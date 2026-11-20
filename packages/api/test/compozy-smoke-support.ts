import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createGitRepository, temporaryDirectory } from "./git-repository-support";

const run = promisify(execFile);
const POLL_INTERVAL_MS = 3_000;
const GIT_IDENTITY = ["-c", "user.name=Flow Dev Smoke", "-c", "user.email=flow-dev-smoke@test.invalid"];

export const smokeEnabled = process.env.COMPOZY_SMOKE === "1";

export async function disposableRepository() {
  const temporary = await temporaryDirectory();
  const root = await createGitRepository(join(temporary.directory, "probe"), { remote: "git@github.com:flow-dev-smoke/probe.git", originHead: false });
  await writeFile(join(root, "README.md"), "smoke probe\n");
  await writeFile(join(root, ".env"), "SMOKE_PROBE=1\n");
  await run("git", ["-C", root, "add", "README.md", ".env"]);
  await run("git", ["-C", root, ...GIT_IDENTITY, "commit", "--quiet", "-m", "probe files"]);
  await run("git", ["-C", root, "update-ref", "refs/remotes/origin/main", "HEAD"]);
  await run("git", ["-C", root, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
  return { root, remove: temporary.remove };
}

export async function poll<T>(read: () => Promise<T>, done: (value: T) => boolean, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let last = await read();
  while (!done(last) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    last = await read().catch(() => last);
  }
  return last;
}

export async function compozyCli(args: string[]) {
  try { return (await run("compozy", args)).stdout.trim(); }
  catch (error) { return `failed: ${commandOutput(error)}`; }
}

export async function removeGitWorktree(root: string, path: string) {
  try { await run("git", ["-C", root, "worktree", "remove", "--force", path]); return "removed"; }
  catch (error) { return `failed: ${commandOutput(error)}`; }
}

function commandOutput(error: unknown) {
  const output = error as { stdout?: string; stderr?: string };
  return [output.stdout, output.stderr].filter(Boolean).join(" ").trim() || String(error);
}

export function record(probe: string, evidence: unknown) {
  console.info(JSON.stringify({ event: "compozy.smoke", probe, evidence }));
}
