import { TaskError } from "../services/tasks/taskErrors";

const SECURE_PROTOCOL = "https:";
const INSECURE_PROTOCOL = "http:";
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

export function parsePlanningBaseUrl(value: string | undefined) {
  if (!value) throw new TaskError("planning_unconfigured");
  const url = parseUrl(value);
  if (url.protocol === SECURE_PROTOCOL) return url;
  if (url.protocol === INSECURE_PROTOCOL && LOOPBACK_HOSTS.includes(url.hostname)) return url;
  throw new TaskError("planning_unconfigured");
}

function parseUrl(value: string) {
  try { return new URL(value); }
  catch { throw new TaskError("planning_unconfigured"); }
}
