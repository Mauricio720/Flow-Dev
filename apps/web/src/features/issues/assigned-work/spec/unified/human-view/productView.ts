import { chunkItems, fragmentsOf } from "./chunkItems";
import { chunksIn, chunksTitled, type Chunk } from "./documentChunks";
import type { OverviewItem, SourcedText, SpecOverview } from "./overviewTypes";
import { journeysOf } from "./productJourneys";
import { requirementsOf } from "./productRequirements";
import { recordedDecisionsAndRisks } from "./recordedItems";
import { summaryFields } from "./summaryFields";
import type { CoverageRow, ProductView } from "./viewTypes";

const PRODUCT_TABS = ["product", "spec"];
const STORIES_TABS = ["user_stories"];
const GOALS_TITLE = /^(objetivos|goals)/i;
const LIMITS_TITLE = /fora d[eo] escopo|non-goals|out of scope|limites|fronteiras|restrições/i;
const RULES_TITLE = /regras|business rules|funcionalidades|core features|escopo funcional|recursos/i;
const PERSONAS_TITLE = /personas/i;
const METRICS_TITLE = /métricas|metrics|indicadores/i;
const LIST = "list";

function itemsTitled(chunks: Chunk[], pattern: RegExp, withParagraphs = false) {
  return chunksTitled(chunks, pattern).flatMap((chunk) => chunkItems(chunk, withParagraphs));
}

function listedItems(chunks: Chunk[], pattern: RegExp) {
  return chunksTitled(chunks, pattern).flatMap((chunk) => chunkItems({ ...chunk, tokens: chunk.tokens.filter((token) => token.type === LIST) }, false));
}

function fragmentItems(field: SourcedText | undefined, prefix: string): OverviewItem[] {
  if (!field) return [];
  return fragmentsOf(field.text).map((title, index) => ({ id: `${prefix}:${index}`, title, detail: [], meta: [], source: field.source }));
}

export function productView(chunks: Chunk[], overview: SpecOverview, coverage: CoverageRow[]): ProductView {
  const product = chunksIn(chunks, PRODUCT_TABS);
  const fields = summaryFields(product);
  const recorded = recordedDecisionsAndRisks(product);
  return {
    goals: itemsTitled(product, GOALS_TITLE),
    nonGoals: itemsTitled(product, LIMITS_TITLE),
    journeys: journeysOf(product),
    requirements: requirementsOf(overview.capabilities, chunksIn(chunks, STORIES_TABS), coverage),
    rules: itemsTitled(product, RULES_TITLE),
    personas: listedItems(chunksIn(chunks, [...STORIES_TABS, ...PRODUCT_TABS]), PERSONAS_TITLE),
    decisions: [...fragmentItems(fields.decisions, "product:decisions"), ...recorded.decisions],
    openQuestions: overview.questions,
    metrics: itemsTitled(product, METRICS_TITLE, true),
    risks: [...fragmentItems(fields.risks, "product:risks"), ...recorded.risks],
  };
}
