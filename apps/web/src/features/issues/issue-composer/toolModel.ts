import type { ToolActivity } from "./contract";
import type { SourceKind } from "./draftSources";

export const SOURCE_KINDS = ["project", "github"] as const;
export const SOURCE_LABEL: Record<SourceKind, string> = { project: "Projeto", github: "GitHub" };
export const SOURCE_INK: Record<SourceKind, string> = { project: "text-project-ink", github: "text-github-ink" };
export const SOURCE_SWATCH: Record<SourceKind, string> = { project: "bg-project", github: "bg-github" };

export const TOOL_SOURCE: Record<ToolActivity["tool"], SourceKind> = {
  searchProject: "project",
  readProjectFile: "project",
  searchGitHubIssues: "github",
  getGitHubIssue: "github",
};

export const OUTCOME_LABEL: Record<ToolActivity["status"], string> = {
  done: "consultado",
  empty: "nada encontrado",
  unavailable: "indisponível",
};

export function citedSources(calls: ToolActivity[]) {
  return SOURCE_KINDS.filter((source) => calls.some((call) => TOOL_SOURCE[call.tool] === source));
}
