import type { Dirent } from "node:fs";
import { lstat, open, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ENV_FILE_PREFIX = ".env";
const PRIVATE_FILE_MODE = 0o600;
const EXCLUSIVE_WRITE_FLAG = "wx";
const ALREADY_EXISTS_CODE = "EEXIST";
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", ".next", ".turbo", ".cache", "coverage"]);

async function openNewFile(destination: string) {
  try {
    return await open(destination, EXCLUSIVE_WRITE_FLAG, PRIVATE_FILE_MODE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === ALREADY_EXISTS_CODE) return null;
    throw error;
  }
}

async function copyIfMissing(source: string, destination: string) {
  const file = await openNewFile(destination);
  if (!file) return;
  try {
    await file.writeFile(await readFile(source));
  } finally {
    await file.close();
  }
}

async function copyEntry(entry: Dirent, source: string, destination: string) {
  if (entry.isFile() && entry.name.startsWith(ENV_FILE_PREFIX)) return copyIfMissing(source, destination);
  if (!entry.isDirectory() || SKIPPED_DIRECTORIES.has(entry.name)) return;
  const target = await lstat(destination).catch(() => null);
  if (target?.isDirectory() && !target.isSymbolicLink()) await copyMissingEnvFiles(source, destination);
}

export async function copyMissingEnvFiles(source: string, destination: string): Promise<void> {
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(entries.map((entry) => copyEntry(entry, join(source, entry.name), join(destination, entry.name))));
}
