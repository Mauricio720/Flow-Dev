import type { Token } from "marked";
import { chunksTitled, firstParagraph, type Chunk } from "./documentChunks";
import type { Contract, ContractPart } from "./viewTypes";

const CONTRACT_TITLE = /interfaces|endpoints?|\bapi\b|modelo de dados|data models|tipos|tRPC/i;
const NOT_CONTRACT_TITLE = /superfície|surface/i;
const PART_KINDS: Record<string, ContractPart["kind"]> = { table: "table", code: "example" };
const SKIPPED = ["space", "hr"];

function partsOf(tokens: Token[]): ContractPart[] {
  const parts: ContractPart[] = [];
  for (const token of tokens) {
    if (SKIPPED.includes(token.type)) continue;
    const kind = PART_KINDS[token.type] ?? "text";
    const last = parts.at(-1);
    if (kind === "text" && last?.kind === "text") last.markdown = `${last.markdown}\n\n${token.raw.trim()}`;
    else parts.push({ kind, markdown: token.raw.trim() });
  }
  return parts;
}

function contractOf(chunk: Chunk): Contract[] {
  const parts = partsOf(chunk.tokens);
  if (parts.length === 0) return [];
  return [{ id: `${chunk.source.documentId}:${chunk.source.sectionId}:${chunk.title}`, title: chunk.title, summary: firstParagraph(chunk), parts, source: chunk.source }];
}

export function contractsOf(dxChunks: Chunk[], technicalChunks: Chunk[]): Contract[] {
  const technical = chunksTitled(technicalChunks, CONTRACT_TITLE, NOT_CONTRACT_TITLE);
  return [...dxChunks, ...technical].flatMap(contractOf);
}
