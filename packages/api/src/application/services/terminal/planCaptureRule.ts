import { posix } from "node:path";

export const PLAN_EXECUTION_SKILL = "plano-de-execucao";

const MARKDOWN_SUFFIX = ".md";
const PARENT_SEGMENT = "..";
const SEGMENT_SEPARATOR = "/";

function isSafeRelative(path: string) {
  return !path.startsWith(SEGMENT_SEPARATOR) && !path.split(SEGMENT_SEPARATOR).includes(PARENT_SEGMENT);
}

function folderPrefix(folder: string) {
  const normalized = posix.normalize(folder).replace(/\/+$/, "");
  return normalized === "" || normalized === "." ? "" : `${normalized}${SEGMENT_SEPARATOR}`;
}

export function isPlanTaskFile(path: string, folder: string): boolean {
  if (!path.endsWith(MARKDOWN_SUFFIX) || !isSafeRelative(path) || !isSafeRelative(folder)) return false;
  return posix.normalize(path).startsWith(folderPrefix(folder));
}
