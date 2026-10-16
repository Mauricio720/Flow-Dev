import type { Token, Tokens } from "marked";
import { statesNothing } from "../documentModel";
import type { Chunk } from "./documentChunks";
import type { OverviewItem } from "./overviewTypes";

export type ItemDraft = { title: string; detail: string[]; meta: string[] };

const BOLD_LEAD = /^\*\*([\s\S]+?)\*\*\s*[:—–-]?\s*/;
const TRAILING_COLON = /:\s*$/;
const NESTED_ITEM = /\n\s*(?:[-*+]|\d+\.)\s/;
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-ZÀ-Ý“"`*[])/u;
const FRAGMENT_BREAK = /;\s+|(?<=[.!?])\s+(?=[A-ZÀ-Ý“"`*[])/u;
const TRAILING_PUNCTUATION = /[;.]$/;

export function splitLead(raw: string) {
  const text = raw.trim();
  const match = BOLD_LEAD.exec(text);
  if (!match) return { lead: null, rest: text };
  return { lead: match[1]!.replace(TRAILING_COLON, "").trim(), rest: text.slice(match[0].length).trim() };
}

export function fragmentsOf(raw: string) {
  return raw.split(FRAGMENT_BREAK).map((part) => part.trim().replace(TRAILING_PUNCTUATION, "")).filter(Boolean);
}

export function listItemTexts(token: Token): string[] {
  if (token.type !== "list") return [];
  return (token as Tokens.List).items.map((item) => item.text.split(NESTED_ITEM)[0]!.trim());
}

export function cellsOf(table: Tokens.Table) {
  return { headers: table.header.map((cell) => cell.text.trim()), rows: table.rows.map((row) => row.map((cell) => cell.text.trim())) };
}

export function labeledCells(headers: string[], row: string[], from: number) {
  return row.slice(from).flatMap((cell, offset) => (cell ? [`**${headers[from + offset] ?? ""}:** ${cell}`] : []));
}

function leadDraft(raw: string): ItemDraft {
  const { lead, rest } = splitLead(raw);
  return lead ? { title: lead, detail: rest ? [rest] : [], meta: [] } : { title: rest, detail: [], meta: [] };
}

function tableDrafts(table: Tokens.Table): ItemDraft[] {
  const { headers, rows } = cellsOf(table);
  return rows.filter((row) => row[0]).map((row) => ({ title: row[0]!, detail: labeledCells(headers, row, 1), meta: [] }));
}

function draftsOf(token: Token, withParagraphs: boolean): ItemDraft[] {
  if (token.type === "list") return listItemTexts(token).map(leadDraft);
  if (token.type === "table") return tableDrafts(token as Tokens.Table);
  if (token.type !== "paragraph" || !withParagraphs) return [];
  return (token as Tokens.Paragraph).text.split(SENTENCE_BREAK).map((sentence) => ({ title: sentence.trim(), detail: [], meta: [] }));
}

export function chunkItems(chunk: Chunk, withParagraphs: boolean): OverviewItem[] {
  return chunk.tokens.flatMap((token) => draftsOf(token, withParagraphs)).filter((draft) => draft.title && !statesNothing(draft.title))
    .map((draft, index) => ({ ...draft, id: `${chunk.source.documentId}:${chunk.source.sectionId}:${chunk.title}:${index}`, source: chunk.source }));
}
