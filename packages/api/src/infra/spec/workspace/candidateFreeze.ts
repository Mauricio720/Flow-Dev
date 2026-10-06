import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { join } from "node:path";
import { SPEC_DOCUMENT_MAX_BYTES, SPEC_PACKAGE_MAX_BYTES, SPEC_PACKAGE_MAX_FILES } from "../../../application/services/spec/specLimits";
import type { SpecStage } from "../../../application/services/spec/specContracts";
import { TaskError } from "../../../application/services/tasks/taskErrors";
import { isStageWritable } from "../../../application/spec/specPermissionBoundary";
import { documentRole, missingDocuments } from "../../../application/spec/specStageDocuments";
import type { CandidateFile, CandidateManifest } from "../../../application/spec/specWorkspaceGateway";
import { sha256Of } from "./fileHash";

const INVALID = () => new TaskError("artifact_invalid");
const LIMIT = () => new TaskError("package_limit");

async function listFiles(root: string, relative = ""): Promise<string[]> {
  const names = await readdir(join(root, relative));
  const found: string[] = [];
  for (const name of names) {
    const path = relative ? `${relative}/${name}` : name;
    const stats = await lstat(join(root, path));
    if (stats.isSymbolicLink()) throw INVALID();
    if (stats.isDirectory()) found.push(...await listFiles(root, path));
    else if (stats.isFile() && stats.nlink === 1) found.push(path);
    else throw INVALID();
  }
  return found;
}

function assertSafeNames(paths: string[], stage: SpecStage) {
  const folded = new Set<string>();
  for (const path of paths) {
    if (!isStageWritable(path, stage) || folded.has(path.toLowerCase())) throw INVALID();
    folded.add(path.toLowerCase());
  }
  if (paths.length > SPEC_PACKAGE_MAX_FILES) throw LIMIT();
}

export async function freezeCandidate(candidatePath: string, stage: SpecStage): Promise<CandidateManifest> {
  const paths = (await listFiles(candidatePath)).sort();
  assertSafeNames(paths, stage);
  const files: CandidateFile[] = [];
  let total = 0;
  for (const path of paths) {
    const bytes = await readCandidateFile(join(candidatePath, path), total);
    total += bytes.length;
    files.push({ path, content: decodeUtf8(bytes) });
  }
  const entries = files.map((file) => ({ path: file.path, role: documentRole(file.path), sha256: sha256Of(file.content), bytes: Buffer.byteLength(file.content) }));
  const missing = missingDocuments(stage, paths);
  return { stage, entries, files, complete: missing.length === 0, missing };
}

async function readCandidateFile(path: string, total: number) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => { throw INVALID(); });
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.nlink !== 1) throw INVALID();
    if (stats.size > SPEC_DOCUMENT_MAX_BYTES || total + stats.size > SPEC_PACKAGE_MAX_BYTES) throw LIMIT();
    return await handle.readFile();
  } finally { await handle.close(); }
}

function decodeUtf8(bytes: Buffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw INVALID(); }
}
