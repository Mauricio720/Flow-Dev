import type { Token, Tokens } from "marked";
import type { ReaderDocument, ReaderSection } from "../documentModel";
import type { ReaderTab } from "../packageReader";
import { friendlyTitle } from "../sectionTitles";
import type { SourceRef } from "./overviewTypes";

export type Chunk = { tabId: string; title: string; tokens: Token[]; source: SourceRef };
type ChunkOwner = { tab: ReaderTab; document: ReaderDocument; section: ReaderSection };

const HEADING = "heading";
const LABEL_SEPARATOR = " › ";

const BACKTICKS = /`/g;

function chunkOf(owner: ChunkOwner, heading?: string): Chunk {
  const { tab, document, section } = owner;
  const label = [tab.label, section.title, heading].filter(Boolean).join(LABEL_SEPARATOR).replace(BACKTICKS, "");
  return { tabId: tab.id, title: heading ?? section.title, tokens: [], source: { tabId: tab.id, documentId: document.id, sectionId: section.id, label } };
}

function sectionChunks(owner: ChunkOwner): Chunk[] {
  const chunks = [chunkOf(owner)];
  for (const token of owner.section.tokens) {
    if (token.type === HEADING) chunks.push(chunkOf(owner, friendlyTitle((token as Tokens.Heading).text)));
    else chunks.at(-1)!.tokens.push(token);
  }
  return chunks;
}

export function chunksOf(tabs: ReaderTab[]): Chunk[] {
  return tabs.flatMap((tab) => tab.documents.flatMap((document) => document.sections.flatMap((section) => sectionChunks({ tab, document, section }))));
}

export function firstParagraph(chunk: Chunk | undefined): string | null {
  const paragraph = chunk?.tokens.find((token) => token.type === "paragraph");
  return paragraph && "text" in paragraph ? paragraph.text.trim() : null;
}

export function chunksIn(chunks: Chunk[], tabIds: string[]) {
  return chunks.filter((chunk) => tabIds.includes(chunk.tabId));
}

export function chunksTitled(chunks: Chunk[], pattern: RegExp, exclude?: RegExp) {
  return chunks.filter((chunk) => pattern.test(chunk.title) && !(exclude && exclude.test(chunk.title)));
}
