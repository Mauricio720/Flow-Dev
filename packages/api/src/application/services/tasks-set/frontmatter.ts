import { parse } from "yaml";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export type Frontmatter = { data: Record<string, unknown>; body: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readFrontmatter(content: string): Frontmatter | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return null;
  try {
    const data: unknown = parse(match[1] ?? "");
    return isRecord(data) ? { data, body: content.slice(match[0].length) } : null;
  } catch {
    return null;
  }
}
