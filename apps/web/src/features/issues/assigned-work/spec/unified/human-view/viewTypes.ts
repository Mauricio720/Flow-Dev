import type { Capability, OverviewItem, SourceRef, SpecOverview } from "./overviewTypes";

export const VIEW_SCHEMA_VERSION = 1;

export type ArtifactRef = { artifactId: string; artifactVersion: number; format: string };
export type Criterion = { id: string; text: string };
export type Requirement = Capability & { acceptance: Criterion[]; edges: Criterion[]; tests: string[] };
export type Journey = { id: string; title: string; steps: string[]; scenarios: OverviewItem[]; note: string | null; source: SourceRef };

export type ProductView = {
  goals: OverviewItem[];
  nonGoals: OverviewItem[];
  journeys: Journey[];
  requirements: Requirement[];
  rules: OverviewItem[];
  personas: OverviewItem[];
  decisions: OverviewItem[];
  openQuestions: OverviewItem[];
  metrics: OverviewItem[];
  risks: OverviewItem[];
};

export type FlowNode = { id: string; label: string; depth: number };
export type FlowEdge = { from: string; to: string; label: string | null };
export type FlowDiagram = { id: string; nodes: FlowNode[]; edges: FlowEdge[]; source: SourceRef };
export type ContractPart = { kind: "text" | "table" | "example"; markdown: string };
export type Contract = { id: string; title: string; summary: string | null; parts: ContractPart[]; source: SourceRef };
export type DataFlow = { id: string; title: string; steps: string[]; source: SourceRef };
export type TestKind = "unit" | "integration" | "e2e" | "other";
export type TestCase = { id: string; kind: TestKind; title: string; source: SourceRef };
export type CoverageRow = { id: string; origin: string; behavior: string; tests: string[]; otherChecks: string[]; stories: string[]; source: SourceRef };

export type TechnicalView = {
  diagrams: FlowDiagram[];
  boundaries: OverviewItem[];
  components: OverviewItem[];
  contracts: Contract[];
  dataFlows: DataFlow[];
  decisions: OverviewItem[];
  alternatives: OverviewItem[];
  risks: OverviewItem[];
  invariants: OverviewItem[];
  impacts: OverviewItem[];
  coverage: CoverageRow[];
  testCases: TestCase[];
};

export type TraceLink = { fromId: string; toId: string; type: "validates" | "covers" };

export type ArtifactView = {
  artifact: ArtifactRef;
  viewSchemaVersion: typeof VIEW_SCHEMA_VERSION;
  overview: SpecOverview;
  product: ProductView;
  technical: TechnicalView;
  relationships: TraceLink[];
  validationWarnings: string[];
};
