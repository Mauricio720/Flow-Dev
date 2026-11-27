import { createHash } from "node:crypto";
import type { LatestVersion, TouchedFile } from "../../database/dao/artifactCaptureDao";
import { PLAN_EXECUTION_SKILL } from "./planCaptureRule";

const MARKDOWN_SUFFIX = ".md";

export type CaptureCandidate = { path: string; skill: string };

export function markdownFilesOf(touched: TouchedFile[]): TouchedFile[] {
  return touched.filter((file) => file.path.endsWith(MARKDOWN_SUFFIX));
}

export function sha256Of(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function needsNewVersion(latest: LatestVersion | null, sha256: string): boolean {
  return latest === null || latest.sha256 !== sha256;
}

export function latestOccurrence(touched: TouchedFile[]): Date | null {
  if (touched.length === 0) return null;
  return new Date(Math.max(...touched.map((file) => file.occurredAt.getTime())));
}

export function untouchedExtras(touched: TouchedFile[], extra: CaptureCandidate[]): CaptureCandidate[] {
  const touchedPaths = new Set(touched.map((file) => file.path));
  return extra.filter((candidate) => candidate.path.endsWith(MARKDOWN_SUFFIX) && !touchedPaths.has(candidate.path));
}

export function folderCandidates(touched: TouchedFile[], folderFiles: string[]): CaptureCandidate[] {
  const touchedPaths = new Set(touched.map((file) => file.path));
  return folderFiles.filter((path) => path.endsWith(MARKDOWN_SUFFIX) && !touchedPaths.has(path)).map((path) => ({ path, skill: PLAN_EXECUTION_SKILL }));
}
