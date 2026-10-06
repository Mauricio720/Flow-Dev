import { mkdir, rename, rm, writeFile, open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { TaskError } from "../../../application/services/tasks/taskErrors";
import type { InstalledManifest, ManifestEntry, PromoteSpecPackage } from "../../../application/spec/specWorkspaceGateway";
import { verifyCanonical } from "./canonicalInspect";
import { fsyncPath, hashFileIfPresent, sha256Of } from "./fileHash";

const CONFLICT = () => new TaskError("artifact_conflict");
const TEMP_PREFIX = ".flow-tmp-";
const REMOVABLE_ROLE = "task";

export async function promoteCanonical(canonicalPath: string, input: PromoteSpecPackage): Promise<InstalledManifest> {
  const prior = new Map(input.expectedPrior.map((entry) => [entry.path, entry.sha256]));
  const staged = await stageAll(canonicalPath, input, prior);
  for (const item of staged) await commitFile(item, input);
  const next = new Set(input.manifest.entries.map((entry) => entry.path));
  for (const entry of input.expectedPrior) if (!next.has(entry.path) && entry.role === REMOVABLE_ROLE) await removeFile(canonicalPath, entry, input);
  return verifyCanonical(canonicalPath, input.manifest.entries);
}

type StagedFile = { path: string; target: string; temporary: string; expectedPrior: string | null; targetHash: string };

async function stageAll(root: string, input: PromoteSpecPackage, prior: Map<string, string>) {
  const staged: StagedFile[] = [];
  try {
    for (const file of input.manifest.files) {
      const item = await stageFile(root, file, prior.get(file.path) ?? null);
      if (item) staged.push(item);
    }
    return staged;
  } catch (error) {
    await Promise.all(staged.map((item) => rm(item.temporary, { force: true })));
    throw error;
  }
}

async function stageFile(root: string, file: { path: string; content: string }, expectedPrior: string | null): Promise<StagedFile | null> {
  const target = join(root, file.path);
  const targetHash = sha256Of(file.content);
  const current = await hashFileIfPresent(target);
  if (current === targetHash) return null;
  if (current !== expectedPrior) throw CONFLICT();
  await mkdir(dirname(target), { recursive: true });
  const temporary = join(dirname(target), `${TEMP_PREFIX}${randomUUID()}`);
  try {
    await writeFile(temporary, file.content, { encoding: "utf8", flag: "wx" });
    await fsyncPath(temporary);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return { path: file.path, target, temporary, expectedPrior, targetHash };
}

async function commitFile(item: StagedFile, input: PromoteSpecPackage) {
  await input.journal.record({ path: item.path, expectedPriorHash: item.expectedPrior, targetHash: item.targetHash, phase: "pending" });
  if ((await hashFileIfPresent(item.target)) !== item.expectedPrior) { await rm(item.temporary, { force: true }); throw CONFLICT(); }
  await rename(item.temporary, item.target);
  await syncDirectory(dirname(item.target));
  await input.journal.record({ path: item.path, expectedPriorHash: item.expectedPrior, targetHash: item.targetHash, phase: "installed" });
}

async function removeFile(root: string, entry: ManifestEntry, input: PromoteSpecPackage) {
  const target = join(root, entry.path);
  const current = await hashFileIfPresent(target);
  if (current === null) return;
  if (current !== entry.sha256) throw CONFLICT();
  await input.journal.record({ path: entry.path, expectedPriorHash: entry.sha256, targetHash: "", phase: "pending" });
  await rm(target);
  await syncDirectory(dirname(target));
  await input.journal.record({ path: entry.path, expectedPriorHash: entry.sha256, targetHash: "", phase: "installed" });
}

async function syncDirectory(path: string) {
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}
