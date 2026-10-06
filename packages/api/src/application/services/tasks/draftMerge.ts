import type { IssueDraft } from "./taskContracts";
import { parseIssueDraft } from "./draftRules";
import { classifyLabels } from "./labelRules";
import { TaskError } from "./taskErrors";

const EDITABLE_PATHS = ["title", "context", "objective", "constraints", "relevantContext", "productConsiderations", "references", "priorityPoints", "labels"];

export function changedDraftPaths(previous: IssueDraft, next: IssueDraft) {
  return EDITABLE_PATHS.filter((path) => JSON.stringify(previous[path as keyof IssueDraft]) !== JSON.stringify(next[path as keyof IssueDraft]));
}

export function applySelectedFields(current: IssueDraft, proposal: IssueDraft, selectedPaths: string[]): IssueDraft {
  if (selectedPaths.some((path) => !EDITABLE_PATHS.includes(path))) throw new TaskError("invalid_field_path");
  const result = { ...current };
  for (const path of new Set(selectedPaths)) Object.assign(result, { [path]: proposal[path as keyof IssueDraft] });
  return parseIssueDraft(result);
}

export function keepPriorityPoints(generated: IssueDraft, current: IssueDraft | null): IssueDraft {
  return { ...generated, priorityPoints: current?.priorityPoints ?? null };
}

export function keepLabels(generated: IssueDraft, current: IssueDraft | null): IssueDraft {
  return { ...generated, labels: current?.labels?.length ? current.labels : classifyLabels(generated) };
}

export function authoredFields(draft: IssueDraft | null) {
  if (!draft) return null;
  const { priorityPoints: _priorityPoints, labels: _labels, ...authored } = draft;
  return authored;
}
