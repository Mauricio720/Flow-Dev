import { mkdir, open, readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";

const LOCK_WAIT_MS = 60_000;

export async function withJournalLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const lockPath = path + ".lock";
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const lock = await acquire(lockPath);
    if (lock) {
      try { return await operation(); }
      finally { await lock.close(); await rm(lockPath, { force: true }); }
    }
    await pause(25);
  }
  throw new Error("journal_lock_timeout");
}

async function acquire(path: string) {
  try {
    const file = await open(path, "wx", 0o600);
    await file.writeFile(String(process.pid));
    await file.sync();
    return file;
  } catch (error) {
    if (!isExists(error)) throw error;
    const owner = Number((await readFile(path, "utf8").catch(() => "")).trim());
    if (Number.isInteger(owner) && owner > 0 && !isAlive(owner)) await rm(path, { force: true });
    return null;
  }
}

function isAlive(pid: number) { try { process.kill(pid, 0); return true; } catch (error) { return isPermissionError(error); } }
function isExists(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST"; }
function isPermissionError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "EPERM"; }
function pause(duration: number) { return new Promise((resolve) => setTimeout(resolve, duration)); }
