import { execFile } from "node:child_process";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import type { LocalExecutionTarget } from "../../application/services/task-flow/localProjectAccess";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { localCheckoutScope } from "../../application/services/local-execution/localCheckoutScope";
import { withJournalLock } from "./journalLock";
import { copyLocalProjectState, copyMissingEnvironmentFiles } from "./copyLocalProjectState";

const git = promisify(execFile);
const GIT_TIMEOUT_MS = 30_000;
const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const WORKTREE_CAUSE = "Não foi possível preparar o worktree desta Issue. Confira o repositório local e prepare novamente.";
type WorktreeInput = { root: string; runtimeRoot: string; target: LocalExecutionTarget; create?: boolean };

function runGit(root: string, args: string[]) {
  return git("git", ["-C", root, ...args], { timeout: GIT_TIMEOUT_MS });
}

async function commonDirectory(root: string) {
  const result = await runGit(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return realpath(result.stdout.trim());
}

async function assertWorktree(input: WorktreeInput, path: string) {
  const metadata = await lstat(path).catch(() => null);
  if (!metadata?.isDirectory() || metadata.isSymbolicLink() || await realpath(path) !== path) throw new LocalExecutionError("path_invalid", { cause: WORKTREE_CAUSE });
  const [source, worktree, top, branch] = await Promise.all([commonDirectory(input.root), commonDirectory(path), runGit(path, ["rev-parse", "--show-toplevel"]), runGit(path, ["symbolic-ref", "HEAD"])]);
  if (source !== worktree || await realpath(top.stdout.trim()) !== path || branch.stdout.trim() !== `refs/heads/flow/issue-${input.target.worktreeTaskId}`) throw new LocalExecutionError("repository_mismatch");
  return path;
}

async function createWorktree(input: WorktreeInput, path: string) {
  const branch = `flow/issue-${input.target.worktreeTaskId}`;
  const exists = await runGit(input.root, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]).then(() => true, () => false);
  const args = exists ? ["worktree", "add", path, branch] : ["worktree", "add", "-b", branch, path, "HEAD"];
  await runGit(input.root, args).catch(() => { throw new LocalExecutionError("path_invalid", { cause: WORKTREE_CAUSE }); });
  await copyLocalProjectState(input.root, path).catch(() => { throw new LocalExecutionError("path_invalid", { cause: WORKTREE_CAUSE }); });
}

export async function localTaskWorktree(input: WorktreeInput): Promise<string> {
  if (!input.target.worktreeTaskId) return input.root;
  if (!UUID_PATTERN.test(input.target.worktreeTaskId)) throw new LocalExecutionError("invalid_input");
  const path = resolve(input.runtimeRoot, "worktrees", localCheckoutScope(input.target));
  if (!input.create) return assertWorktree(input, path);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  return withJournalLock(path, async () => {
    if (!await lstat(path).catch(() => null)) await createWorktree(input, path);
    const worktree = await assertWorktree(input, path);
    await copyMissingEnvironmentFiles(input.root, worktree).catch(() => { throw new LocalExecutionError("path_invalid", { cause: WORKTREE_CAUSE }); });
    return worktree;
  });
}
