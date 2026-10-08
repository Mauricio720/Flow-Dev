import { createHash } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";

export async function acquireLocalCheckoutRunLock(runtimeRoot: string, checkoutHandle: string, runId: string) {
  const directory = join(runtimeRoot, "checkout-locks");
  const path = join(directory, `${createHash("sha256").update(checkoutHandle).digest("hex")}.json`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const file = await open(path, "wx", 0o600);
    try { await file.writeFile(JSON.stringify({ checkoutHandle, runId, createdAt: new Date().toISOString() })); await file.sync(); }
    finally { await file.close(); }
    const parent = await open(directory, "r");
    try { await parent.sync(); } finally { await parent.close(); }
    return;
  } catch (error) {
    if (!isExists(error)) throw error;
    const lock = await readFile(path, "utf8").then((value) => JSON.parse(value) as { checkoutHandle?: unknown; runId?: unknown }).catch(() => null);
    if (lock?.checkoutHandle === checkoutHandle && lock.runId === runId) return;
    throw new LocalExecutionError("checkout_busy", { cause: error });
  }
}

export async function releaseLocalCheckoutRunLock(runtimeRoot: string, checkoutHandle: string, runId: string) {
  const directory = join(runtimeRoot, "checkout-locks");
  const path = join(directory, `${createHash("sha256").update(checkoutHandle).digest("hex")}.json`);
  const lock = await readFile(path, "utf8").then((value) => JSON.parse(value) as { checkoutHandle?: unknown; runId?: unknown }).catch(() => null);
  if (lock?.checkoutHandle !== checkoutHandle || lock.runId !== runId) return;
  await unlink(path).catch((error: unknown) => { if (!isMissing(error)) throw error; });
  const parent = await open(directory, "r");
  try { await parent.sync(); } finally { await parent.close(); }
}

function isExists(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST"; }
function isMissing(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"; }
