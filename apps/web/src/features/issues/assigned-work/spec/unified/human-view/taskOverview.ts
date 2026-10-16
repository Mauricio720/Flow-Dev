import type { ReaderDocument } from "../documentModel";
import type { ReaderTab } from "../packageReader";
import { listItemTexts, splitLead } from "./chunkItems";
import { chunksOf, firstParagraph, type Chunk } from "./documentChunks";
import type { SourcedText, TaskCard, TasksOverview } from "./overviewTypes";

const MANIFEST_TAB = "tasks_manifest";
const TASK_TAB = "task";
const GRAPH_EDGE = /-\s*from:\s*["']?task_(\d+)["']?\s*\r?\n\s*to:\s*["']?task_(\d+)/g;
const GRAPH_BLOCK = /^graph:\s*$/m;
const TASK_NUMBER = /task_(\d+)/;
const TASK_PREFIX = /^(task|tarefa)\s+\d+\s*[:—–-]\s*/i;
const OUTCOME_TITLE = /resultado|outcome|objetivo|goal/i;
const OVERVIEW_TITLE = /visão geral|overview/i;
const COVERAGE_TITLE = /cobertura|coverage/i;
const RESULT_LABEL = /^(resultado|outcome)/i;
const RESULT_PREFIX = /^(resultado|outcome)\s*:\s*/i;
const TRACE_ID = /\b(?:US-\d+|UT-\d+|IT-\d+|E2E-\d+)\b/g;
const COMPLEXITY_LABELS: Record<string, string> = { low: "complexidade baixa", medium: "complexidade média", high: "complexidade alta", critical: "complexidade crítica" };

function metaValue(document: ReaderDocument, name: string) {
  return document.meta.find(([key]) => key === name)?.[1].replace(/^["']|["']$/g, "") ?? null;
}

function outcomeOf(chunks: Chunk[]) {
  const first = chunks.find((chunk) => OUTCOME_TITLE.test(chunk.title))?.tokens.flatMap(listItemTexts)[0];
  if (!first) return firstParagraph(chunks.find((chunk) => OVERVIEW_TITLE.test(chunk.title)));
  const { lead, rest } = splitLead(first);
  return lead && RESULT_LABEL.test(lead) ? rest : first.replace(RESULT_PREFIX, "");
}

function cardOf(tab: ReaderTab, document: ReaderDocument, edges: [number, number][]): TaskCard | null {
  const chunks = chunksOf([{ ...tab, documents: [document] }]);
  const number = Number(TASK_NUMBER.exec(document.path)?.[1] ?? Number.NaN);
  if (!Number.isFinite(number) || chunks.length === 0) return null;
  const title = (metaValue(document, "title") ?? document.title ?? document.path).replace(TASK_PREFIX, "");
  const kind = metaValue(document, "type");
  const complexity = COMPLEXITY_LABELS[metaValue(document, "complexity") ?? ""];
  const outcome = outcomeOf(chunks);
  const source = { ...chunks[0]!.source, label: `${tab.label} › ${title}` };
  return { id: document.id, number, title, detail: outcome ? [outcome] : [], meta: [kind, complexity].filter((value): value is string => Boolean(value)), dependsOn: edges.filter(([, to]) => to === number).map(([from]) => from), covers: [...new Set(document.source.match(TRACE_ID) ?? [])], source };
}

function sourcedParagraph(chunks: Chunk[], pattern: RegExp): SourcedText | null {
  const chunk = chunks.find((candidate) => pattern.test(candidate.title));
  const text = firstParagraph(chunk);
  return chunk && text ? { text, source: chunk.source } : null;
}

export function tasksOverview(tabs: ReaderTab[]): TasksOverview {
  const manifestTab = tabs.find((tab) => tab.id === MANIFEST_TAB);
  const manifestSource = manifestTab?.documents[0]?.source ?? "";
  const edges = [...manifestSource.matchAll(GRAPH_EDGE)].map((match) => [Number(match[1]), Number(match[2])] as [number, number]);
  const manifestChunks = manifestTab ? chunksOf([manifestTab]) : [];
  const taskTab = tabs.find((tab) => tab.id === TASK_TAB);
  const tasks = (taskTab?.documents ?? []).map((document) => cardOf(taskTab!, document, edges)).filter((card): card is TaskCard => card !== null);
  return { kind: "tasks", outcome: sourcedParagraph(manifestChunks, OUTCOME_TITLE), coverage: sourcedParagraph(manifestChunks, COVERAGE_TITLE), tasks: tasks.sort((left, right) => left.number - right.number), graphKnown: GRAPH_BLOCK.test(manifestSource) };
}
