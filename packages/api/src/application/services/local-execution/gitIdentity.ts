export function githubRepositoryIdentity(remote: string): string | null {
  const value = remote.trim();
  const ssh = value.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]}`.toLowerCase();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password) return null;
    const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    return parts.length === 2 && parts.every(Boolean) ? `${parts[0]}/${parts[1]}`.toLowerCase() : null;
  } catch { return null; }
}

export function isWithinRoot(root: string, candidate: string): boolean {
  const relative = candidate.slice(root.length).replace(/^[/\\]+/, "");
  return candidate === root || (candidate.startsWith(`${root}/`) && relative !== ".." && !relative.startsWith("../"));
}
