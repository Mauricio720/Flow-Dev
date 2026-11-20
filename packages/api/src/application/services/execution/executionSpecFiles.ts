import { relative } from "node:path";
import type { CompozyFileEntry, CompozyGateway } from "../../compozy/compozyGateway";
import { TaskError } from "../tasks/taskErrors";

const FILE_KIND = "file";
const DIRECTORY_KIND = "directory";
const MAIN_SPEC_FILE = "_spec.md";
const EMPTY_PATH = "";
const PARENT_PATH_PREFIX = "..";

export type SpecFile = { path: string; content: string } | { path: string; sensitive: true };
export type SpecFilesInput = { workspaceId: string; worktreeId: string; specDir: string };
type DirectoryGateway = Pick<CompozyGateway, "listFileEntries">;
type FileGateway = DirectoryGateway & Pick<CompozyGateway, "readFile">;

export async function collectSpecFiles(gateway: DirectoryGateway, input: SpecFilesInput) {
  const entries: CompozyFileEntry[] = [];
  await collectDirectory({ gateway, input, path: input.specDir, files: entries });
  return entries.filter((entry) => isSpecFile(input.specDir, entry)).sort((left, right) => compareSpecFiles(input.specDir, left, right));
}

export async function readSpecFiles(gateway: FileGateway, input: SpecFilesInput): Promise<SpecFile[]> {
  const entries = await collectSpecFiles(gateway, input);
  const files: SpecFile[] = [];
  for (const entry of entries) files.push(await readSpecFile(gateway, input, entry));
  return files;
}

export async function hasMainSpecFile(gateway: DirectoryGateway, input: SpecFilesInput) {
  const entries = await collectSpecFiles(gateway, input);
  return entries.some((entry) => relative(input.specDir, entry.path) === MAIN_SPEC_FILE);
}

type CollectDirectoryInput = { gateway: DirectoryGateway; input: SpecFilesInput; path: string; files: CompozyFileEntry[] };

async function collectDirectory({ gateway, input, path, files }: CollectDirectoryInput) {
  const entries = await gateway.listFileEntries({ workspaceId: input.workspaceId, worktreeId: input.worktreeId, path });
  for (const entry of entries) {
    if (entry.symlink) continue;
    if (entry.kind === DIRECTORY_KIND) await collectDirectory({ gateway, input, path: entry.path, files });
    if (entry.kind === FILE_KIND) files.push(entry);
  }
}

async function readSpecFile(gateway: FileGateway, input: SpecFilesInput, entry: CompozyFileEntry): Promise<SpecFile> {
  const path = relative(input.specDir, entry.path);
  if (entry.sensitive) return { path, sensitive: true };
  const content = await gateway.readFile({ workspaceId: input.workspaceId, worktreeId: input.worktreeId, path: entry.path });
  return "sensitive" in content ? { path, sensitive: true } : { path, content: content.content };
}

function isSpecFile(specDir: string, entry: CompozyFileEntry) {
  const path = relative(specDir, entry.path);
  return entry.kind === FILE_KIND && !entry.symlink && path !== EMPTY_PATH && !path.startsWith(PARENT_PATH_PREFIX);
}

function compareSpecFiles(specDir: string, left: CompozyFileEntry, right: CompozyFileEntry) {
  const leftPath = relative(specDir, left.path);
  const rightPath = relative(specDir, right.path);
  if (leftPath === MAIN_SPEC_FILE) return -1;
  if (rightPath === MAIN_SPEC_FILE) return 1;
  return leftPath.localeCompare(rightPath);
}
