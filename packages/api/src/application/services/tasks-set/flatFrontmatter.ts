import type { Frontmatter } from "./frontmatter";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const FLAT_ENTRY_PATTERN = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;
const WRAPPING_QUOTES_PATTERN = /^(["'])(.*)\1$/;

function unquote(value: string) {
  return value.trim().replace(WRAPPING_QUOTES_PATTERN, "$2");
}

function flatEntries(block: string) {
  const entries = block.split(/\r?\n/).map((line) => FLAT_ENTRY_PATTERN.exec(line));
  return Object.fromEntries(entries.filter((entry) => entry !== null).map((entry) => [entry[1], unquote(entry[2] ?? "")]));
}

// Agents often write `title: Login: erros` without quotes, which strict YAML rejects; top-level keys stay readable.
export function readFlatFrontmatter(content: string): Frontmatter | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return null;
  return { data: flatEntries(match[1] ?? ""), body: content.slice(match[0].length) };
}
