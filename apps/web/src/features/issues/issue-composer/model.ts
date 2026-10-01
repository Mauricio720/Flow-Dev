export type Source = "project" | "github";

export type ToolName = "searchProject" | "readProjectFile" | "searchGitHubIssues" | "getGitHubIssue";

export type ToolCall = {
  id: string;
  tool: ToolName;
  target: string;
  status: "running" | "done" | "empty";
  result?: string;
  ms?: number;
};

export type Reference = { label: string; source: Source };

export type IssueDraft = {
  title: string;
  context: string;
  goal: string;
  criteria: string[];
  labels: string[];
  references: Reference[];
};

export type ThreadItem =
  | { id: string; kind: "user"; text: string; at: string }
  | { id: string; kind: "agent"; text: string; at: string }
  | { id: string; kind: "clarify"; text: string; at: string; suggestions: string[] }
  | { id: string; kind: "tools"; calls: ToolCall[] }
  | { id: string; kind: "draft"; draft: IssueDraft; status: "review" | "publishing" | "published"; issueNumber?: number };

export type SessionPhase = "new" | "thinking" | "awaiting" | "draft" | "published";

export type Session = {
  id: string;
  title: string;
  branch: string;
  phase: SessionPhase;
  items: ThreadItem[];
};

export const REPO = "acme/loja-web";

export const toolSource: Record<ToolName, Source> = {
  searchProject: "project",
  readProjectFile: "project",
  searchGitHubIssues: "github",
  getGitHubIssue: "github",
};
