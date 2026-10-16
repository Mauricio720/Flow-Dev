import type { Tokens } from "marked";
import { cellsOf, listItemTexts } from "./chunkItems";
import { firstParagraph, type Chunk } from "./documentChunks";
import type { Capability } from "./overviewTypes";

type IndexRow = { persona: string | null; result: string };

const STORIES_TAB = "user_stories";
const STORY_HEADING = /^(US-\d+)\s*[—–:-]+\s*(.+)$/;
const STORY_ID = /^US-\d+$/;
const ID_HEADER = /^id$/i;
const PERSONA_HEADER = /persona/i;
const CRITERION = /^(\*\*)?AC-\d+/;
const EDGE_CASE = /^(\*\*)?EC-\d+/;
const WITHDRAWN = /\((withdrawn|retirad[ao])\)/i;

function indexRows(table: Tokens.Table): [string, IndexRow][] {
  const { headers, rows } = cellsOf(table);
  if (!ID_HEADER.test(headers[0] ?? "")) return [];
  const persona = headers.findIndex((header) => PERSONA_HEADER.test(header));
  return rows.filter((row) => STORY_ID.test(row[0] ?? "")).map((row) => [row[0]!, { persona: persona > 0 ? row[persona] || null : null, result: row.at(-1) || "" }]);
}

function storyIndex(chunks: Chunk[]) {
  const tables = chunks.flatMap((chunk) => chunk.tokens.filter((token): token is Tokens.Table => token.type === "table"));
  return new Map(tables.flatMap(indexRows));
}

function countItems(chunk: Chunk, pattern: RegExp) {
  return chunk.tokens.flatMap(listItemTexts).filter((text) => pattern.test(text)).length;
}

function capabilityOf(chunk: Chunk, index: Map<string, IndexRow>): Capability[] {
  const match = STORY_HEADING.exec(chunk.title.trim());
  if (!match || WITHDRAWN.test(chunk.title)) return [];
  const [, code, heading] = match as unknown as [string, string, string];
  const row = index.get(code);
  const narrative = firstParagraph(chunk);
  return [{ id: code, code, title: row?.result || heading, detail: narrative ? [narrative] : [], meta: row?.persona ? [row.persona] : [], criteria: countItems(chunk, CRITERION), edgeCases: countItems(chunk, EDGE_CASE), source: chunk.source }];
}

export function capabilitiesOf(chunks: Chunk[]): Capability[] {
  const stories = chunks.filter((chunk) => chunk.tabId === STORIES_TAB);
  const index = storyIndex(stories);
  return stories.flatMap((chunk) => capabilityOf(chunk, index));
}
