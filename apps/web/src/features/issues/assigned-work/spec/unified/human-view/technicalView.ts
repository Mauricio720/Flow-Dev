import { diagramsOf } from "./architectureFlow";
import { chunkItems, listItemTexts } from "./chunkItems";
import { chunksIn, chunksTitled, type Chunk } from "./documentChunks";
import { coverageRows, testCases } from "./coverageMatrix";
import { impactItems, recordedDecisionsAndRisks } from "./recordedItems";
import { contractsOf } from "./technicalContracts";
import type { DataFlow, TechnicalView } from "./viewTypes";

const TECHNICAL_TABS = ["technical", "spec"];
const ARCHITECTURE_TITLE = /arquitetura|architecture|fronteiras|boundaries/i;
const COMPONENTS_TITLE = /componentes|components|composição/i;
const NOT_COMPONENTS_TITLE = /regras|rules|primitiv/i;
const FLOW_TITLE = /fluxo|flow|ciclo|monitor|operaç|persist|coerência|navegação|consultas/i;
const NOT_FLOW_TITLE = /constru|build|development|desenvolvimento|sequenc/i;
const ALTERNATIVES_TITLE = /compara|alternativ/i;
const INVARIANTS_TITLE = /invariant|garantias|safety/i;

function itemsTitled(chunks: Chunk[], pattern: RegExp, exclude?: RegExp) {
  return chunksTitled(chunks, pattern, exclude).flatMap((chunk) => chunkItems(chunk, false));
}

function dataFlowsOf(chunks: Chunk[]): DataFlow[] {
  return chunksTitled(chunks, FLOW_TITLE, NOT_FLOW_TITLE).flatMap((chunk) => {
    const steps = chunk.tokens.flatMap(listItemTexts);
    return steps.length > 0 ? [{ id: `${chunk.source.documentId}:${chunk.source.sectionId}:${chunk.title}`, title: chunk.title, steps, source: chunk.source }] : [];
  });
}

export function technicalView(chunks: Chunk[]): TechnicalView {
  const technical = chunksIn(chunks, TECHNICAL_TABS);
  const recorded = recordedDecisionsAndRisks(technical);
  const tests = chunksIn(chunks, ["tests"]);
  return {
    diagrams: diagramsOf(technical),
    boundaries: itemsTitled(technical, ARCHITECTURE_TITLE),
    components: itemsTitled(chunksIn(chunks, [...TECHNICAL_TABS, "uiux"]), COMPONENTS_TITLE, NOT_COMPONENTS_TITLE),
    contracts: contractsOf(chunksIn(chunks, ["dx"]), technical),
    dataFlows: dataFlowsOf(technical),
    decisions: recorded.decisions,
    alternatives: itemsTitled(technical, ALTERNATIVES_TITLE),
    risks: recorded.risks,
    invariants: itemsTitled(technical, INVARIANTS_TITLE),
    impacts: impactItems(technical),
    coverage: coverageRows(tests),
    testCases: testCases(tests),
  };
}
