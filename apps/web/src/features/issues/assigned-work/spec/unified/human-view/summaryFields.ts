import { listItemTexts, splitLead } from "./chunkItems";
import type { Chunk } from "./documentChunks";
import type { SourceRef, SourcedText } from "./overviewTypes";

export type SummaryField = "what" | "why" | "decisions" | "risks" | "open";
export type SummaryFields = Partial<Record<SummaryField, SourcedText>>;

const SUMMARY_TITLE = /^(resumo executivo|executive summary)$/i;
const FIELD_LABELS: [SummaryField, RegExp][] = [
  ["what", /^(o que muda|what changes)/i],
  ["why", /^(por que importa|why it matters)/i],
  ["decisions", /^(decis|key decisions)/i],
  ["risks", /^(riscos|risks)/i],
  ["open", /^(questões|perguntas|pendências|open questions|unresolved)/i],
];

function fieldEntry(raw: string, source: SourceRef): [SummaryField, SourcedText][] {
  const { lead, rest } = splitLead(raw);
  const field = lead ? FIELD_LABELS.find(([, label]) => label.test(lead))?.[0] : undefined;
  return field && rest ? [[field, { text: rest, source }]] : [];
}

function fieldsOf(chunk: Chunk): SummaryFields {
  const entries = chunk.tokens.flatMap(listItemTexts).flatMap((raw) => fieldEntry(raw, chunk.source));
  return Object.fromEntries(entries.reverse());
}

export function summaryFields(chunks: Chunk[]): SummaryFields {
  const summaries = chunks.filter((chunk) => SUMMARY_TITLE.test(chunk.title.trim())).map(fieldsOf);
  return summaries.find((fields) => Object.keys(fields).length > 0) ?? {};
}
