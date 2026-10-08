import { randomBytes, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { githubRepositoryIdentity, isWithinRoot } from "../../application/services/local-execution/gitIdentity";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { PrivateRegistryStore, type RegistryEntry } from "./privateRegistry";

const run = promisify(execFile);
const MAX_PATH_BYTES = 4096;

export class LocalCheckoutRegistry {
  constructor(private readonly store: PrivateRegistryStore, private readonly allowedRoots: string[]) {}

  async link(input: { path: string; expectedRepository?: string; label: string }): Promise<Omit<RegistryEntry, "root">> {
    const root = await this.resolveRoot(input.path);
    if (Buffer.byteLength(root, "utf8") > MAX_PATH_BYTES) throw new LocalExecutionError("path_limit");
    const allowed = await this.allowedCanonicalRoots();
    if (!allowed.some((candidate) => isWithinRoot(candidate, root))) throw new LocalExecutionError("path_not_allowed");
    const repository = await this.repositoryAt(root);
    if (input.expectedRepository && repository !== input.expectedRepository.toLowerCase()) throw new LocalExecutionError("repository_mismatch");
    const current = await this.store.read();
    const existing = current.entries.find((entry) => entry.root === root);
    const entry = { handle: existing?.handle ?? randomBytes(32).toString("hex"), key: existing?.key ?? randomBytes(32).toString("hex"), root, repository, label: sanitizeLabel(input.label) };
    await this.store.write({ ...current, entries: [...current.entries.filter((candidate) => candidate.root !== root), entry] });
    return { handle: entry.handle, key: entry.key, repository, label: entry.label };
  }

  async rootFor(handle: string, key: string): Promise<string> {
    const entry = (await this.store.read()).entries.find((candidate) => candidate.handle === handle);
    if (!entry) throw new LocalExecutionError("path_invalid");
    if (!matchesKey(key, entry.key)) throw new LocalExecutionError("path_not_allowed");
    const root = await realpath(entry.root).catch(() => null);
    if (root !== entry.root) throw new LocalExecutionError("path_invalid");
    const gitRoot = await run("git", ["-C", root, "rev-parse", "--show-toplevel"], { timeout: 5000 }).catch(() => null);
    if (!gitRoot || await realpath(gitRoot.stdout.trim()).catch(() => null) !== root) throw new LocalExecutionError("not_git_root");
    if (await this.repositoryAt(root) !== entry.repository) throw new LocalExecutionError("repository_mismatch");
    return root;
  }

  private async resolveRoot(value: string) {
    if (!value || !isAbsolute(value) || Buffer.byteLength(value, "utf8") > MAX_PATH_BYTES) throw new LocalExecutionError(value ? "path_limit" : "path_invalid");
    const candidate = await realpath(resolve(value)).catch(() => null);
    if (!candidate || !(await stat(candidate).catch(() => null))?.isDirectory()) throw new LocalExecutionError("path_invalid");
    const gitRoot = await run("git", ["-C", candidate, "rev-parse", "--show-toplevel"], { timeout: 5000 }).catch(() => null);
    if (!gitRoot || await realpath(gitRoot.stdout.trim()) !== candidate) throw new LocalExecutionError("not_git_root");
    return candidate;
  }

  private async repositoryAt(root: string) {
    const remote = await run("git", ["-C", root, "remote", "get-url", "origin"], { timeout: 5000 }).catch(() => null);
    const repository = remote ? githubRepositoryIdentity(remote.stdout) : null;
    if (!repository) throw new LocalExecutionError("repository_mismatch");
    return repository;
  }

  private async allowedCanonicalRoots() { return Promise.all(this.allowedRoots.map((root) => realpath(root).catch(() => null))).then((roots) => roots.filter((root): root is string => Boolean(root))); }
}

function sanitizeLabel(value: string) { return value.trim().replace(/[\u0000-\u001f\u007f/\\]/g, " ").slice(0, 80) || "Development machine"; }
function matchesKey(value: string, expected: string) {
  const actual = Buffer.from(value);
  const stored = Buffer.from(expected);
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}
