import { isPackagePath, type PackageFile } from "../task-flow/artifactValidator";
import { LocalExecutionError } from "./localExecutionErrors";

export const ARTIFACT_PATH_PATTERN = /^(?:adrs\/)?[A-Za-z0-9_][A-Za-z0-9._-]{0,99}\.md$/;
export const ARTIFACT_BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
export const ARTIFACT_CHUNK_BYTES = 96 * 1024;
export const ARTIFACT_MAX_BYTES = 256 * 1024;
export const ARTIFACT_MAX_PARTS = Math.ceil(ARTIFACT_MAX_BYTES / ARTIFACT_CHUNK_BYTES);
export const ARTIFACT_MAX_BASE64_LENGTH = Math.ceil(ARTIFACT_CHUNK_BYTES / 3) * 4;
export const ARTIFACT_MAX_FILES = 64;

const SECRET_PATTERN = /(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|https?:\/\/[^\s/@]+:[^\s/@]+@)/i;
const TASKS_MANIFEST = "_tasks.md";
const TASK_FILE = /^task_\d+\.md$/;

export type ArtifactPart = { path: string; part: number; parts: number; contentBase64: string };

export function isSafeArtifact(file: PackageFile) {
  if (!ARTIFACT_PATH_PATTERN.test(file.path)) return false;
  if (Buffer.byteLength(file.content, "utf8") > ARTIFACT_MAX_BYTES) return false;
  return !SECRET_PATTERN.test(file.content);
}

// The agent may leave working notes beside the documents; only files with a role in the package are sent.
export function belongsToAction(path: string, actionKind: string) {
  if (!isPackagePath(path)) return false;
  const taskFile = path === TASKS_MANIFEST || TASK_FILE.test(path);
  return actionKind === "create_tasks" ? taskFile : !taskFile;
}

export function splitArtifact(file: PackageFile): ArtifactPart[] {
  const bytes = Buffer.from(file.content, "utf8");
  const parts = Math.ceil(bytes.length / ARTIFACT_CHUNK_BYTES);
  return Array.from({ length: parts }, (_, index) => {
    const chunk = bytes.subarray(index * ARTIFACT_CHUNK_BYTES, (index + 1) * ARTIFACT_CHUNK_BYTES);
    return { path: file.path, part: index + 1, parts, contentBase64: chunk.toString("base64") };
  });
}

export function assembleArtifacts(received: ArtifactPart[]): PackageFile[] {
  const byPath = new Map<string, ArtifactPart[]>();
  for (const part of received) byPath.set(part.path, [...(byPath.get(part.path) ?? []), part]);
  if (byPath.size > ARTIFACT_MAX_FILES) throw new LocalExecutionError("evidence_rejected");
  return [...byPath.entries()].map(([path, parts]) => assembleFile(path, parts));
}

function assembleFile(path: string, parts: ArtifactPart[]): PackageFile {
  const ordered = [...parts].sort((first, second) => first.part - second.part);
  const complete = ordered.every((part, index) => part.part === index + 1 && part.parts === ordered.length);
  if (!complete) throw new LocalExecutionError("evidence_rejected");
  const content = Buffer.concat(ordered.map((part) => Buffer.from(part.contentBase64, "base64"))).toString("utf8");
  const file = { path, content };
  if (!isSafeArtifact(file)) throw new LocalExecutionError("artifact_unsafe");
  return file;
}
