import { createHash } from "node:crypto";
import type { LatestVersion, TouchedFile } from "../../database/dao/artifactCaptureDao";

const MARKDOWN_SUFFIX = ".md";

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
