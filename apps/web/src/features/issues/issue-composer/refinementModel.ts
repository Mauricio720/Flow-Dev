import type { IssueDraft } from "./contract";
import { proposedPaths, type GeneratedPath } from "./draftModel";
import { sourceLabel } from "./draftSources";

const EMPTY_VALUE = "(vazio)";
const LIST_SEPARATOR = "\n";

export type ProposalField = { path: GeneratedPath; current: string; proposed: string; manuallyEdited: boolean };

function describe(draft: IssueDraft, path: GeneratedPath) {
  if (path === "title" || path === "context" || path === "objective") return draft[path] || EMPTY_VALUE;
  if (path === "relevantContext") return draft.relevantContext.map((entry) => `${entry.statement} (${sourceLabel(entry.source)})`).join(LIST_SEPARATOR) || EMPTY_VALUE;
  if (path === "references") return draft.references.map(sourceLabel).join(LIST_SEPARATOR) || EMPTY_VALUE;
  return draft[path].join(LIST_SEPARATOR) || EMPTY_VALUE;
}

export function proposalFields(current: IssueDraft, proposal: IssueDraft, manuallyEditedPaths: string[]): ProposalField[] {
  return proposedPaths(current, proposal).map((path) => ({ path, current: describe(current, path), proposed: describe(proposal, path), manuallyEdited: manuallyEditedPaths.includes(path) }));
}

export function preselectedPaths(fields: ProposalField[]) {
  return fields.filter((field) => !field.manuallyEdited).map((field) => field.path);
}
