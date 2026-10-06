import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { gfm } from "micromark-extension-gfm";
import { sha256Hex } from "../../services/spec/specPayload";
import { checkBlockCoverage } from "./blockCoverage";
import type { DocumentInput, ParsedDocument, ReviewBlock, ReviewBlockKind, ReviewDiagnostic } from "./specDocumentTypes";
import { utf8OffsetTable } from "./sourceBytes";

type Node = { type: string; lang?: string | null; depth?: number; position?: { start: { offset?: number }; end: { offset?: number } } };
const KIND_BY_NODE: Record<string, ReviewBlockKind> = { heading: "heading", paragraph: "prose", list: "list", table: "table", code: "code", yaml: "code" };
const DIAGRAM_LANGUAGE = "mermaid";
const RAW_HTML_NODE = "html";

export function parseSpecDocuments(inputs: DocumentInput[]): ParsedDocument[] {
  return inputs.map(parseDocument);
}

function parseDocument(input: DocumentInput): ParsedDocument {
  const sha256 = sha256Hex(input.bytes);
  const base = { path: input.path, role: input.role, sha256, byteCount: input.bytes.length };
  const text = decode(input.bytes);
  if (text === null) return { ...base, sourceText: null, blocks: [], diagnostics: [{ code: "invalid_utf8", severity: "blocking", documentId: input.path, blockId: null, message: "O documento não é UTF-8 válido" }] };
  const tree = fromMarkdown(text, { extensions: [gfm(), frontmatter(["yaml"])], mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(["yaml"])] });
  const offsets = utf8OffsetTable(text);
  const blocks = (tree.children as Node[]).map((node, index) => toBlock(node, index, { text, offsets, path: input.path }));
  const diagnostics: ReviewDiagnostic[] = [...checkBlockCoverage(Buffer.from(text, "utf8"), blocks, input.path), ...htmlDiagnostics(tree.children as Node[], blocks, input.path)];
  return { ...base, sourceText: text, blocks, diagnostics };
}

function decode(bytes: Buffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return null; }
}

function toBlock(node: Node, index: number, context: { text: string; offsets: Uint32Array; path: string }): ReviewBlock {
  const start = node.position?.start.offset ?? 0;
  const end = node.position?.end.offset ?? start;
  const content = context.text.slice(start, end);
  const kind = node.type === "code" && node.lang?.toLowerCase() === DIAGRAM_LANGUAGE ? "diagram" : KIND_BY_NODE[node.type] ?? "prose";
  const bytes = Buffer.from(content, "utf8");
  return { id: `b${index + 1}`, documentId: context.path, sourceHash: sha256Hex(bytes), startByte: context.offsets[start]!, endByte: context.offsets[end]!, kind, content, ...(node.type === "heading" ? { level: node.depth } : {}) };
}

function htmlDiagnostics(nodes: Node[], blocks: ReviewBlock[], path: string): ReviewDiagnostic[] {
  return nodes.flatMap((node, index) => node.type === RAW_HTML_NODE ? [{ code: "raw_html_inert", severity: "observation" as const, documentId: path, blockId: blocks[index]!.id, message: "HTML bruto exibido como texto inerte" }] : []);
}
