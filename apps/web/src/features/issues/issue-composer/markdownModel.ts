import { safeGitHubUrl } from "./draftSources";

export type MarkdownBlock = { kind: "heading"; text: string } | { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };
export type MarkdownSpan = { kind: "text" | "code"; text: string } | { kind: "link"; text: string; href: string };

const HEADING_PREFIX = "## ";
const ITEM_PREFIX = "- ";
const BLOCK_BREAK = /\n{2,}/;
// Matches an inline code span or a [label](destination) link; anything else stays literal text.
const SPAN_PATTERN = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

function blockOf(source: string): MarkdownBlock {
  const lines = source.split("\n");
  if (lines.length === 1 && source.startsWith(HEADING_PREFIX)) return { kind: "heading", text: source.slice(HEADING_PREFIX.length) };
  if (lines.every((line) => line.startsWith(ITEM_PREFIX))) return { kind: "list", items: lines.map((line) => line.slice(ITEM_PREFIX.length)) };
  return { kind: "paragraph", text: source };
}

export function markdownBlocks(body: string): MarkdownBlock[] {
  return body.split(BLOCK_BREAK).filter((source) => source.trim()).map(blockOf);
}

function spanOf(match: RegExpMatchArray): MarkdownSpan {
  if (match[1] !== undefined) return { kind: "code", text: match[1] };
  const href = safeGitHubUrl(match[3]);
  return href ? { kind: "link", text: match[2], href } : { kind: "text", text: match[0] };
}

export function markdownSpans(text: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let cursor = 0;
  for (const match of text.matchAll(SPAN_PATTERN)) {
    if (match.index > cursor) spans.push({ kind: "text", text: text.slice(cursor, match.index) });
    spans.push(spanOf(match));
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) spans.push({ kind: "text", text: text.slice(cursor) });
  return spans;
}
