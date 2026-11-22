export const MAX_CHECKOUT_PATH_LENGTH = 1024;
const ABSOLUTE_PATH_PREFIX = "/";
const GITHUB_HOST = "github.com";
const SCP_REMOTE = /^[\w.-]+@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;
const URL_PROTOCOLS = new Set(["https:", "http:", "ssh:", "git:"]);

export function isValidCheckoutPath(path: string) {
  if (path.length === 0 || path.length > MAX_CHECKOUT_PATH_LENGTH) return false;
  return path.startsWith(ABSOLUTE_PATH_PREFIX);
}

export function repositorySlugOf(remoteUrl: string): string | null {
  const scp = SCP_REMOTE.exec(remoteUrl.trim());
  if (scp) return slug(scp[1]!, scp[2]!);
  return slugFromUrl(remoteUrl.trim());
}

function slugFromUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!URL_PROTOCOLS.has(url.protocol)) return null;
  if (url.hostname.toLowerCase() !== GITHUB_HOST) return null;
  const [owner, name, ...rest] = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (!owner || !name || rest.length > 0) return null;
  return slug(owner, name.replace(/\.git$/i, ""));
}

function slug(owner: string, name: string) {
  if (!owner || !name) return null;
  return `${owner}/${name}`.toLowerCase();
}

export function matchesRepository(remotes: string[], repository: string) {
  const expected = repository.toLowerCase();
  return remotes.some((remote) => repositorySlugOf(remote) === expected);
}
