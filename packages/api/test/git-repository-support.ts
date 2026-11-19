import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const DEFAULT_BRANCH = "main";
const GIT_IDENTITY = ["-c", "user.name=Flow Dev Test", "-c", "user.email=flow-dev@test.invalid"];

export type GitRepositoryOptions = { remote?: string; originHead?: boolean };

export async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "flow-dev-checkout-"));
  return { directory, remove: () => rm(directory, { recursive: true, force: true }) };
}

export async function createGitRepository(path: string, options: GitRepositoryOptions = {}) {
  await mkdir(path, { recursive: true });
  await git(path, ["init", "--quiet", "-b", DEFAULT_BRANCH]);
  await git(path, [...GIT_IDENTITY, "commit", "--quiet", "--allow-empty", "-m", "initial"]);
  if (options.remote) await git(path, ["remote", "add", "origin", options.remote]);
  if (options.remote && options.originHead !== false) await publishOriginHead(path);
  return path;
}

async function publishOriginHead(path: string) {
  await git(path, ["update-ref", `refs/remotes/origin/${DEFAULT_BRANCH}`, "HEAD"]);
  await git(path, ["symbolic-ref", "refs/remotes/origin/HEAD", `refs/remotes/origin/${DEFAULT_BRANCH}`]);
}

function git(path: string, args: string[]) {
  return run("git", ["-C", path, ...args]);
}
