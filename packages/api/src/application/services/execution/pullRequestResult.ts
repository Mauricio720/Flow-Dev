const PR_LINE = /^PR:\s*(https:\/\/\S+)\s*$/;
const PR_FIELD_NAMES = ["pr", "pull_request", "pullRequest", "pull_request_url", "pullRequestUrl"];
const HTTPS_PREFIX = "https://";

export function pullRequestFromResult(result: string) {
  return lastLineUrl(result) ?? structuredUrl(parseJson(result));
}

function lastLineUrl(text: string) {
  const lastLine = text.trim().split("\n").at(-1)?.trim() ?? "";
  return PR_LINE.exec(lastLine)?.[1] ?? null;
}

function structuredUrl(value: unknown): string | null {
  if (typeof value === "string") return lastLineUrl(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const field = PR_FIELD_NAMES.map((name) => record[name]).find((entry): entry is string => typeof entry === "string" && entry.startsWith(HTTPS_PREFIX));
  if (field) return field;
  return Object.values(record).filter((entry): entry is string => typeof entry === "string").map(lastLineUrl).find(Boolean) ?? null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
