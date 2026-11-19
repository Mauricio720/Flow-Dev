import { TaskError } from "../services/tasks/taskErrors";

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

export function parseCompozyUrl(value: string | undefined) {
  if (!value) throw new TaskError("compozy_unconfigured");
  const url = parseUrl(value);
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) throw new TaskError("compozy_unconfigured");
  if (!LOOPBACK_HOSTS.includes(url.hostname)) throw new TaskError("compozy_unconfigured");
  if (url.username || url.password || url.search || url.hash) throw new TaskError("compozy_unconfigured");
  return url.origin;
}

function parseUrl(value: string) {
  try { return new URL(value); }
  catch { throw new TaskError("compozy_unconfigured"); }
}
