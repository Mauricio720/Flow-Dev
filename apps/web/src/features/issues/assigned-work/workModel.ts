const GITHUB_ORIGIN = "https://github.com/";
const SHORT_HASH_LENGTH = 8;

export function safeIssueUrl(url: string) {
  return url.startsWith(GITHUB_ORIGIN) ? url : null;
}

export function shortHash(hash: string) {
  return hash.slice(0, SHORT_HASH_LENGTH);
}
