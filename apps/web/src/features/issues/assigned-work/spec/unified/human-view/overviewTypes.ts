export type SourceRef = { tabId: string; documentId: string; sectionId: string; label: string };
export type OpenSource = (source: SourceRef) => void;

export type OverviewItem = { id: string; title: string; detail: string[]; meta: string[]; source: SourceRef };
export type ItemGroup = { highlights: OverviewItem[]; recorded: OverviewItem[] };
export type SourcedText = { text: string; source: SourceRef };
export type Capability = OverviewItem & { code: string; criteria: number; edgeCases: number };
export type FileReferences = { count: number; source: SourceRef };

export type SpecOverview = {
  kind: "spec";
  what: SourcedText | null;
  why: SourcedText | null;
  openNote: SourcedText | null;
  capabilities: Capability[];
  decisions: ItemGroup;
  risks: ItemGroup;
  questions: OverviewItem[];
  impacts: OverviewItem[];
  files: FileReferences | null;
};

export type TaskCard = OverviewItem & { number: number; dependsOn: number[]; covers: string[] };
export type TasksOverview = { kind: "tasks"; outcome: SourcedText | null; coverage: SourcedText | null; tasks: TaskCard[]; graphKnown: boolean };

export type PackageOverview = SpecOverview | TasksOverview;
