import { createHash } from "node:crypto";
import { lstat, open, readFile } from "node:fs/promises";

export const sha256Of = (content: Buffer | string) => createHash("sha256").update(content).digest("hex");

export async function hashFileIfPresent(path: string) {
  try {
    const stats = await lstat(path);
    if (!stats.isFile() || stats.isSymbolicLink()) return "unsafe";
    return sha256Of(await readFile(path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function fsyncPath(path: string) {
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}
