import { realpath } from "node:fs/promises";
import { runGit } from "../terminal/gitCommands";

const WORKTREE_ADD_TIMEOUT_MS = 120_000;
const BRANCH_REF_PREFIX = "refs/heads/";
const WORKTREE_LINE_PREFIX = "worktree ";
const BRANCH_LINE_PREFIX = "branch ";
const PRUNABLE_LINE_PREFIX = "prunable";
const ENTRY_SEPARATOR = "\n\n";
const LINE_SEPARATOR = "\n";

type WorktreeEntry = { path: string | null; branch: string | null; prunable: boolean };
export type AddWorktreeInput = { root: string; path: string; branch: string; branchExists: boolean };

function parseEntry(block: string): WorktreeEntry {
  const lines = block.split(LINE_SEPARATOR);
  const valueOf = (prefix: string) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null;
  return { path: valueOf(WORKTREE_LINE_PREFIX), branch: valueOf(BRANCH_LINE_PREFIX), prunable: lines.some((line) => line.startsWith(PRUNABLE_LINE_PREFIX)) };
}

export async function commonDirOf(directory: string) {
  const result = await runGit(directory, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return result.ok ? realpath(result.stdout.trim()).catch(() => null) : null;
}

export async function branchExists(root: string, branch: string) {
  const result = await runGit(root, ["show-ref", "--verify", "--quiet", `${BRANCH_REF_PREFIX}${branch}`]);
  return result.ok;
}

export async function branchCheckoutPath(root: string, input: { branch: string; ownPath: string }) {
  const result = await runGit(root, ["worktree", "list", "--porcelain"]);
  if (!result.ok) return null;
  const ref = `${BRANCH_REF_PREFIX}${input.branch}`;
  const busy = result.stdout.split(ENTRY_SEPARATOR).map(parseEntry).find((entry) => entry.branch === ref && !entry.prunable && entry.path !== input.ownPath);
  return busy?.path ?? null;
}

export async function addWorktree(input: AddWorktreeInput) {
  await runGit(input.root, ["worktree", "prune"]);
  const args = input.branchExists ? ["worktree", "add", input.path, input.branch] : ["worktree", "add", "-b", input.branch, input.path, "HEAD"];
  const result = await runGit(input.root, args, WORKTREE_ADD_TIMEOUT_MS);
  return result.ok;
}
