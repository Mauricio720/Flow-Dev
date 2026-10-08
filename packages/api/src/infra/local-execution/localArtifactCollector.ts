import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ARTIFACT_MAX_FILES, belongsToAction, isSafeArtifact } from "../../application/services/local-execution/localArtifacts";
import type { PackageFile } from "../../application/services/task-flow/artifactValidator";

const ARTIFACT_DIRECTORY = ".flow-spec";
const ADR_DIRECTORY = "adrs";
const MARKDOWN_SUFFIX = ".md";
const PACKAGE_KINDS = ["create_spec", "create_tasks"];

async function markdownIn(directory: string, prefix: string): Promise<PackageFile[]> {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true }).catch(() => []);
  const names = entries.filter((entry) => entry.isFile() && entry.name.endsWith(MARKDOWN_SUFFIX)).map((entry) => entry.name);
  return Promise.all(names.map(async (name) => ({ path: prefix ? `${prefix}/${name}` : name, content: await readFile(join(directory, prefix, name), "utf8") })));
}

export async function collectLocalArtifacts(root: string, actionKind: string): Promise<PackageFile[] | null> {
  if (!PACKAGE_KINDS.includes(actionKind)) return [];
  const directory = join(root, ARTIFACT_DIRECTORY);
  const found = [...(await markdownIn(directory, "")), ...(await markdownIn(directory, ADR_DIRECTORY))];
  const files = found.filter((file) => belongsToAction(file.path, actionKind) && file.content.length > 0);
  if (files.length > ARTIFACT_MAX_FILES || !files.every(isSafeArtifact)) return null;
  return files;
}
