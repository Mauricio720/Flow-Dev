import type { Tokens } from "marked";
import { cellsOf, chunkItems, labeledCells, listItemTexts } from "./chunkItems";
import type { Chunk } from "./documentChunks";
import type { FileReferences, OverviewItem } from "./overviewTypes";

const DECISION_TITLE = /decis/i;
const NOT_DECISION_TITLE = /fontes|sources|compara|alternativ|pendentes|cobertura|coverage/i;
const RISK_TITLE = /riscos?\b|risks?\b|pontos de atenção/i;
const RISK_LEAD = /^(riscos?|risks?)\b/i;
const IMPACT_TITLE = /impact|impacto/i;
const FILES_TITLE = /refer[eê]ncias de arquivos|file references|arquivos de refer[eê]ncia/i;
const SHORT_META_CHARS = 24;

function isDecisionChunk(chunk: Chunk) {
  return DECISION_TITLE.test(chunk.title) && !NOT_DECISION_TITLE.test(chunk.title);
}

export function recordedDecisionsAndRisks(chunks: Chunk[]) {
  const decisions: OverviewItem[] = [];
  const risks: OverviewItem[] = [];
  for (const chunk of chunks) {
    const decisionChunk = isDecisionChunk(chunk);
    const riskChunk = RISK_TITLE.test(chunk.title);
    if (!decisionChunk && !riskChunk) continue;
    for (const item of chunkItems(chunk, riskChunk && !decisionChunk)) {
      const isRisk = riskChunk && (!decisionChunk || RISK_LEAD.test(item.title));
      (isRisk ? risks : decisions).push(item);
    }
  }
  return { decisions, risks };
}

function impactRows(chunk: Chunk): OverviewItem[] {
  const tables = chunk.tokens.filter((token): token is Tokens.Table => token.type === "table");
  return tables.flatMap((table) => {
    const { headers, rows } = cellsOf(table);
    return rows.filter((row) => row[0]).map((row, index) => {
      const shortMeta = (row[1] ?? "").length > 0 && (row[1] ?? "").length <= SHORT_META_CHARS;
      return { id: `${chunk.source.sectionId}:impact:${index}`, title: row[0]!, meta: shortMeta ? [row[1]!] : [], detail: labeledCells(headers, row, shortMeta ? 2 : 1), source: chunk.source };
    });
  });
}

export function impactItems(chunks: Chunk[]): OverviewItem[] {
  return chunks.filter((chunk) => IMPACT_TITLE.test(chunk.title)).flatMap(impactRows);
}

export function fileReferences(chunks: Chunk[]): FileReferences | null {
  const chunk = chunks.find((candidate) => FILES_TITLE.test(candidate.title));
  if (!chunk) return null;
  const rows = chunk.tokens.reduce((total, token) => total + (token.type === "table" ? (token as Tokens.Table).rows.length : listItemTexts(token).length), 0);
  return rows > 0 ? { count: rows, source: chunk.source } : null;
}
