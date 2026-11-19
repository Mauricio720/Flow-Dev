import { execFile } from "node:child_process";
import { realpath, stat, access } from "node:fs/promises";
import { constants } from "node:fs";
import { promisify } from "node:util";
import type { CheckoutInspection, CheckoutInspector } from "../../application/git/checkoutInspector";
import { TaskError } from "../../application/services/tasks/taskErrors";

const run = promisify(execFile);
const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 1024 * 1024;
const ORIGIN_HEAD = "refs/remotes/origin/HEAD";
const ORIGIN_PREFIX = "refs/remotes/origin/";
const WHITESPACE = /\s+/;

export class GitCheckoutInspector implements CheckoutInspector {
  constructor(private readonly gitBinary = "git") {}

  async inspect(path: string): Promise<CheckoutInspection> {
    const directory = await readableDirectory(path);
    const root = await this.gitRoot(directory);
    if (root !== directory) throw new TaskError("checkout_not_git_root");
    return { root, remotes: await this.remotes(root), defaultBranch: await this.defaultBranch(root) };
  }

  private async gitRoot(directory: string) {
    const output = await this.git(directory, ["rev-parse", "--show-toplevel"]).catch(() => null);
    if (output === null) throw new TaskError("checkout_not_git_root");
    return realpath(output.trim()).catch(() => { throw new TaskError("checkout_not_git_root"); });
  }

  private async remotes(root: string) {
    const output = await this.git(root, ["remote", "-v"]).catch(() => "");
    const urls = output.split("\n").map((line) => line.trim().split(WHITESPACE)[1]).filter((url): url is string => Boolean(url));
    return [...new Set(urls)];
  }

  private async defaultBranch(root: string) {
    const output = await this.git(root, ["symbolic-ref", "--quiet", ORIGIN_HEAD]).catch(() => null);
    const ref = output?.trim() ?? "";
    return ref.startsWith(ORIGIN_PREFIX) && ref.length > ORIGIN_PREFIX.length ? ref.slice(ORIGIN_PREFIX.length) : null;
  }

  private async git(directory: string, args: string[]) {
    const { stdout } = await run(this.gitBinary, ["-C", directory, ...args], { timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER, env: gitEnvironment() });
    return stdout;
  }
}

async function readableDirectory(path: string) {
  try {
    const resolved = await realpath(path);
    if (!(await stat(resolved)).isDirectory()) throw new TaskError("checkout_not_found");
    await access(resolved, constants.R_OK | constants.X_OK);
    return resolved;
  } catch { throw new TaskError("checkout_not_found"); }
}

function gitEnvironment() {
  return { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: "C", GIT_TERMINAL_PROMPT: "0" };
}
