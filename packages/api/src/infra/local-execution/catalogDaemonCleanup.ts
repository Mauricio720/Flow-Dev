import { readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CATALOG_DIRECTORY_PREFIX = "flow-provider-catalog-";
const PID_FILE = "daemon.pid";
const COMPOZY_STATE_FILE = join(".compozy", "daemon.json");
const STALE_AFTER_MS = 5 * 60_000;
const STOP_SIGNAL = "SIGTERM";
const FATAL_SIGNALS = { SIGTERM: 143, SIGHUP: 129 } as const;
const PRIVATE_FILE_MODE = 0o600;
const REMOVE_RETRIES = 10;
const REMOVE_RETRY_DELAY_MS = 300;

const live = new Set<number>();
let hooked = false;

function stopGroup(pid: number) {
  try { process.kill(-pid, STOP_SIGNAL); } catch { /* the daemon has already exited */ }
}

function stopLiveDaemons() {
  for (const pid of live) stopGroup(pid);
}

// The catalog daemon is detached, so it outlives a connector that is stopped while a discovery is in flight.
function hookProcessExit() {
  if (hooked) return;
  hooked = true;
  process.on("exit", stopLiveDaemons);
  process.on("SIGINT", stopLiveDaemons);
  for (const [signal, exitCode] of Object.entries(FATAL_SIGNALS)) process.once(signal, () => { stopLiveDaemons(); process.exit(exitCode); });
}

export async function trackCatalogDaemon(pid: number, directory: string) {
  live.add(pid);
  hookProcessExit();
  await writeFile(join(directory, PID_FILE), `${pid}\n`, { mode: PRIVATE_FILE_MODE });
}

export function releaseCatalogDaemon(pid: number) {
  live.delete(pid);
}

async function recordedPid(directory: string) {
  const own = await readFile(join(directory, PID_FILE), "utf8").catch(() => "");
  if (/^\d+\n?$/.test(own)) return Number(own.trim());
  const state = await readFile(join(directory, COMPOZY_STATE_FILE), "utf8").then((text) => JSON.parse(text) as { pid?: unknown }, () => null);
  return typeof state?.pid === "number" && Number.isInteger(state.pid) && state.pid > 1 ? state.pid : null;
}

async function runsFrom(pid: number, directory: string) {
  const environment = await readFile(`/proc/${pid}/environ`, "utf8").catch(() => "");
  return environment.split("\0").includes(`COMPOZY_HOME=${join(directory, ".compozy")}`);
}

// The daemon uses the directory as its temporary folder, so the modification time keeps moving while it is alive.
function createdAt(info: { birthtimeMs: number; mtimeMs: number }) {
  return info.birthtimeMs > 0 ? info.birthtimeMs : info.mtimeMs;
}

/** Stops and removes catalog daemons left behind by a connector that was killed before it could clean up. */
export async function sweepStaleCatalogDaemons(root: string = tmpdir(), now: number = Date.now()) {
  const names = await readdir(root).catch(() => [] as string[]);
  for (const name of names.filter((candidate) => candidate.startsWith(CATALOG_DIRECTORY_PREFIX))) {
    const directory = join(root, name);
    const info = await stat(directory).catch(() => null);
    if (!info?.isDirectory() || info.uid !== process.getuid?.() || now - createdAt(info) < STALE_AFTER_MS) continue;
    const pid = await recordedPid(directory);
    if (pid && !live.has(pid) && await runsFrom(pid, directory)) stopGroup(pid);
    await rm(directory, { recursive: true, force: true, maxRetries: REMOVE_RETRIES, retryDelay: REMOVE_RETRY_DELAY_MS }).catch(() => undefined);
  }
}
