import type { OpenPoint } from "../openPoints";
import type { ReaderTab } from "../packageReader";
import { fragmentsOf } from "./chunkItems";
import { chunksOf } from "./documentChunks";
import type { ItemGroup, OverviewItem, SourcedText, SpecOverview } from "./overviewTypes";
import { fileReferences, impactItems, recordedDecisionsAndRisks } from "./recordedItems";
import { capabilitiesOf } from "./storyCapabilities";
import { summaryFields } from "./summaryFields";

const SPEC_TABS = ["product", "technical", "spec"];
const HIGHLIGHT_LIMIT = 4;
const LABEL_SEPARATOR = " › ";

function summaryItems(field: SourcedText | undefined, prefix: string): OverviewItem[] {
  if (!field) return [];
  return fragmentsOf(field.text).map((title, index) => ({ id: `${prefix}:${index}`, title, detail: [], meta: [], source: field.source }));
}

function groupOf(field: SourcedText | undefined, recorded: OverviewItem[], prefix: string): ItemGroup {
  const highlights = summaryItems(field, prefix);
  if (highlights.length > 0) return { highlights, recorded };
  return { highlights: recorded.slice(0, HIGHLIGHT_LIMIT), recorded: recorded.slice(HIGHLIGHT_LIMIT) };
}

function questionItems(points: OpenPoint[], tabs: ReaderTab[]): OverviewItem[] {
  return points.flatMap((point) => {
    const tab = tabs.find((candidate) => candidate.documents.some((document) => document.id === point.documentId));
    if (!tab) return [];
    const source = { tabId: tab.id, documentId: point.documentId, sectionId: point.sectionId, label: [tab.label, point.sectionTitle].join(LABEL_SEPARATOR) };
    return [{ id: point.id, title: point.text, detail: point.detail.map((token) => token.raw.trim()).filter(Boolean), meta: [], source }];
  });
}

export function specOverview(tabs: ReaderTab[], points: OpenPoint[]): SpecOverview {
  const chunks = chunksOf(tabs);
  const specChunks = chunks.filter((chunk) => SPEC_TABS.includes(chunk.tabId));
  const fields = summaryFields(specChunks);
  const recorded = recordedDecisionsAndRisks(specChunks);
  return {
    kind: "spec",
    what: fields.what ?? null,
    why: fields.why ?? null,
    openNote: fields.open ?? null,
    capabilities: capabilitiesOf(chunks),
    decisions: groupOf(fields.decisions, recorded.decisions, "summary:decisions"),
    risks: groupOf(fields.risks, recorded.risks, "summary:risks"),
    questions: questionItems(points, tabs),
    impacts: impactItems(specChunks),
    files: fileReferences(specChunks),
  };
}
