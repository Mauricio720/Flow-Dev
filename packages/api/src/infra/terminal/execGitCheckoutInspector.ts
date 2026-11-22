import { realpath, stat } from "node:fs/promises";
import type { CheckoutInspection, GitCheckoutInspector } from "../../application/terminal/gitCheckoutInspector";
import { runGit } from "./gitCommands";

const DETACHED_SHA_LENGTH = 7;
const REMOTE_URL_LINE = /^remote\..+\.url (.+)$/;

async function resolveDirectory(path: string) {
  try {
    const resolved = await realpath(path);
    return (await stat(resolved)).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

async function readRemotes(directory: string) {
  const result = await runGit(directory, ["config", "--get-regexp", "^remote\\..*\\.url$"]);
  if (!result.ok) return [];
  return result.stdout.split("\n").map((line) => REMOTE_URL_LINE.exec(line)?.[1]).filter((url): url is string => !!url);
}

async function readHead(directory: string) {
  const branch = await runGit(directory, ["symbolic-ref", "--short", "-q", "HEAD"]);
  if (branch.ok) return { branch: branch.stdout.trim(), detachedSha: null };
  const sha = await runGit(directory, ["rev-parse", `--short=${DETACHED_SHA_LENGTH}`, "HEAD"]);
  return { branch: null, detachedSha: sha.ok ? sha.stdout.trim() : null };
}

async function readDirty(directory: string) {
  const result = await runGit(directory, ["status", "--porcelain"]);
  return result.ok && result.stdout.trim().length > 0;
}

export class ExecGitCheckoutInspector implements GitCheckoutInspector {
  async inspect(path: string): Promise<CheckoutInspection> {
    const directory = await resolveDirectory(path);
    if (!directory) return { kind: "missing" };
    const top = await runGit(directory, ["rev-parse", "--show-toplevel"]);
    if (!top.ok) return { kind: "not_repository" };
    const root = await realpath(top.stdout.trim());
    if (root !== directory) return { kind: "subfolder", root };
    const [remotes, head, dirty] = await Promise.all([readRemotes(root), readHead(root), readDirty(root)]);
    return { kind: "repository", root, remotes, ...head, dirty };
  }
}
