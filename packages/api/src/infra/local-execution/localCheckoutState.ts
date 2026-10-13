import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { isCompozyRuntimeState } from "./compozyRuntimeState";

const exec = promisify(execFile);
const LISTING_MAX_BYTES = 8 * 1024 * 1024;

export type CheckoutState = { digest: string; dirty: boolean; files: Map<string, string> };

function isWithin(root: string, path: string) {
  const value = relative(root, path);
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value));
}

function digest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export async function checkoutState(root: string): Promise<CheckoutState> {
  const [status, listing, deleted] = await Promise.all([
    exec("git", ["-C", root, "status", "--porcelain", "--untracked-files=all"], { maxBuffer: 1024 * 1024 }),
    exec("git", ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { maxBuffer: LISTING_MAX_BYTES }),
    exec("git", ["-C", root, "ls-files", "--deleted", "-z"], { maxBuffer: LISTING_MAX_BYTES }),
  ]);
  const deletedPaths = new Set(deleted.stdout.split("\0").filter(Boolean));
  const files = new Map<string, string>();
  for (const path of listing.stdout.split("\0").filter(Boolean).sort()) {
    if (isCompozyRuntimeState(path)) continue;
    if (isAbsolute(path) || path.split(/[\\/]/).some((part) => part === ".." || part === ".git")) throw new LocalExecutionError("path_not_allowed");
    const fullPath = resolve(root, path);
    const metadata = await lstat(fullPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!metadata && deletedPaths.has(path)) continue;
    if (!metadata?.isFile()) throw new LocalExecutionError("path_not_allowed");
    const canonical = await realpath(fullPath).catch(() => null);
    if (!canonical || !isWithin(root, canonical)) throw new LocalExecutionError("path_not_allowed");
    files.set(path, digest(await readFile(canonical)));
  }
  const aggregate = [...files].map(([path, hash]) => `${path}\0${hash}`).join("\0");
  return { digest: digest(aggregate), dirty: status.stdout.length > 0, files };
}
