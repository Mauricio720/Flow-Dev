import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type TemporaryRepository = { path: string; cleanup: () => Promise<void> };

const COMMIT_IDENTITY = ["-c", "user.email=e2e@flow.test", "-c", "user.name=E2E"];

export function commitBase(path: string) {
  execFileSync("git", [...COMMIT_IDENTITY, "commit", "-q", "--allow-empty", "-m", "base"], { cwd: path });
}

export async function createGitRepository(remoteSlug: string): Promise<TemporaryRepository> {
  const base = await mkdtemp(join(tmpdir(), "e2e-clone-"));
  const path = join(base, "Área de trabalho", "shop");
  await mkdir(path, { recursive: true });
  execFileSync("git", ["init", "-q"], { cwd: path });
  execFileSync("git", ["remote", "add", "origin", `git@github.com:${remoteSlug}.git`], { cwd: path });
  return { path, cleanup: () => rm(base, { recursive: true, force: true }) };
}
