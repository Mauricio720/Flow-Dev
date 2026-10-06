import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import { TaskError } from "../../../application/services/tasks/taskErrors";
import { installedManifestHash } from "../../../application/spec/specManifest";
import { documentRole } from "../../../application/spec/specStageDocuments";
import type { InstalledManifest, ManifestEntry } from "../../../application/spec/specWorkspaceGateway";
import { hashFileIfPresent } from "./fileHash";

const TEMP_PREFIX = ".flow-tmp-";
const CONFLICT = () => new TaskError("artifact_conflict");

export async function inspectCanonical(canonicalPath: string): Promise<InstalledManifest> {
  const entries = await scan(canonicalPath);
  return { entries, manifestHash: installedManifestHash(entries) };
}

async function scan(root: string, relative = ""): Promise<ManifestEntry[]> {
  let names: string[];
  try { names = await readdir(join(root, relative)); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const entries: ManifestEntry[] = [];
  for (const name of names.filter((item) => !item.startsWith(TEMP_PREFIX))) {
    const path = relative ? `${relative}/${name}` : name;
    const stats = await lstat(join(root, path));
    if (stats.isDirectory()) entries.push(...await scan(root, path));
    else if (stats.isFile()) entries.push({ path, role: documentRole(path), sha256: (await hashFileIfPresent(join(root, path)))!, bytes: stats.size });
  }
  return entries;
}

export async function verifyCanonical(canonicalPath: string, expected: ManifestEntry[]) {
  for (const entry of expected) {
    const actual = await hashFileIfPresent(join(canonicalPath, entry.path));
    if (actual !== entry.sha256) throw CONFLICT();
  }
  return inspectCanonical(canonicalPath);
}

