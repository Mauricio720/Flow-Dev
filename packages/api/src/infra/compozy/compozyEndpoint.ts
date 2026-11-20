import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseCompozyUrl } from "../../application/compozy/compozyConfiguration";

const DEFAULT_DAEMON_URL = "http://127.0.0.1:2123";
const DAEMON_RECORD = "daemon.json";
const COMPOZY_DIRECTORY = ".compozy";
const LOOPBACK_IPV4 = "127.0.0.1";
const LOOPBACK_IPV6 = "[::1]";
const ANY_IPV4 = "0.0.0.0";
const ANY_IPV6 = ["::", "[::]"];

type DaemonRecord = { port?: unknown; http_host?: unknown };

export async function resolveCompozyBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.COMPOZY_URL) return parseCompozyUrl(environment.COMPOZY_URL);
  const record = await readDaemonRecord(compozyHome(environment));
  return parseCompozyUrl(record ? recordUrl(record) : DEFAULT_DAEMON_URL);
}

function compozyHome(environment: NodeJS.ProcessEnv) {
  return resolve(environment.COMPOZY_HOME?.trim() || join(homedir(), COMPOZY_DIRECTORY));
}

async function readDaemonRecord(home: string): Promise<DaemonRecord | null> {
  const content = await readFile(join(home, DAEMON_RECORD), "utf8").catch(() => null);
  if (content === null) return null;
  try { return JSON.parse(content) as DaemonRecord; }
  catch { return {}; }
}

function recordUrl(record: DaemonRecord) {
  if (typeof record.port !== "number") return "";
  return `http://${dialHost(record.http_host)}:${record.port}`;
}

function dialHost(value: unknown) {
  const host = typeof value === "string" && value.trim() ? value.trim() : LOOPBACK_IPV4;
  if (host === ANY_IPV4) return LOOPBACK_IPV4;
  if (ANY_IPV6.includes(host)) return LOOPBACK_IPV6;
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}
