import { cp, lstat, open, readFile, readdir, unlink } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const EXCLUDED_DIRECTORIES = new Set([".git", ".next", ".turbo", ".cache", "coverage", "node_modules"]);

function shouldCopy(source: string, root: string) {
  const parts = relative(root, source).split(sep);
  return !parts.some((part) => EXCLUDED_DIRECTORIES.has(part) || part.startsWith(".env"));
}

export async function copyLocalProjectState(root: string, destination: string): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.name !== ".git")
    .map((entry) => cp(join(root, entry.name), join(destination, entry.name), {
      recursive: true,
      dereference: false,
      filter: (source) => shouldCopy(source, root),
    })));
  await copyMissingEnvironmentFiles(root, destination);
}

async function copyMissingEnvironmentFile(source: string, destination: string): Promise<void> {
  const file = await open(destination, "wx", 0o600).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") return null;
    throw error;
  });
  if (!file) return;
  try {
    await file.writeFile(await readFile(source));
  } catch (error) {
    await unlink(destination);
    throw error;
  } finally {
    await file.close();
  }
}

export async function copyMissingEnvironmentFiles(root: string, destination: string): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const source = join(root, entry.name);
    const target = join(destination, entry.name);
    if (entry.isFile() && entry.name.startsWith(".env")) return copyMissingEnvironmentFile(source, target);
    if (!entry.isDirectory() || EXCLUDED_DIRECTORIES.has(entry.name)) return;
    const targetEntry = await lstat(target).catch(() => null);
    if (targetEntry?.isDirectory() && !targetEntry.isSymbolicLink()) await copyMissingEnvironmentFiles(source, target);
  }));
}
