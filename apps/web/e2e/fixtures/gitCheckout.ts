import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const DEFAULT_BRANCH = "main";
const ACCENTED_PARENT = "Área de trabalho";
const GIT_IDENTITY = ["-c", "user.name=Flow Dev E2E", "-c", "user.email=flow-dev-e2e@test.invalid"];

export type GitCheckout = { path: string; defaultBranch: string };

function git(path: string, args: string[]) {
  return run("git", ["-C", path, ...args]);
}

export async function disposableCheckout(repository: string) {
  const directory = await mkdtemp(join(tmpdir(), "flow-dev-e2e-"));
  const path = join(directory, ACCENTED_PARENT, repository.split("/")[1]);
  await mkdir(path, { recursive: true });
  await git(path, ["init", "--quiet", "-b", DEFAULT_BRANCH]);
  await git(path, [...GIT_IDENTITY, "commit", "--quiet", "--allow-empty", "-m", "initial"]);
  await git(path, ["remote", "add", "origin", `https://github.com/${repository}.git`]);
  await git(path, ["update-ref", `refs/remotes/origin/${DEFAULT_BRANCH}`, "HEAD"]);
  await git(path, ["symbolic-ref", "refs/remotes/origin/HEAD", `refs/remotes/origin/${DEFAULT_BRANCH}`]);
  const checkout: GitCheckout = { path, defaultBranch: DEFAULT_BRANCH };
  return { checkout, remove: () => rm(directory, { recursive: true, force: true }) };
}
