import type { PlanItemDraft, StoredPlanItem } from "./planTypes";

const FIRST_POSITION = 1;

function afterOrderMessage(position: number, target: number) {
  return `A Sessão ${position} começa depois da Sessão ${target}, que vem depois dela na ordem.`;
}

export function normalizeAfter(after: number[]) {
  return [...new Set(after)].sort((left, right) => left - right);
}

export function findAfterProblem(drafts: PlanItemDraft[]): string | null {
  for (const [index, draft] of drafts.entries()) {
    const position = index + FIRST_POSITION;
    const invalid = draft.after.find((target) => target >= position || target < FIRST_POSITION);
    if (invalid !== undefined) return afterOrderMessage(position, invalid);
  }
  return null;
}

function draftAfterIds(draft: PlanItemDraft, drafts: PlanItemDraft[]) {
  return draft.after.map((target) => drafts[target - FIRST_POSITION]?.id ?? null);
}

function sameIds(stored: string[], drafted: (string | null)[]) {
  const left = [...new Set(stored)].sort();
  const right = [...new Set(drafted)].sort();
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function startedAfterChanged(stored: StoredPlanItem[], drafts: PlanItemDraft[]) {
  return stored.filter((item) => item.started).some((item) => {
    const draft = drafts.find((candidate) => candidate.id === item.id);
    return draft !== undefined && !sameIds(item.after, draftAfterIds(draft, drafts));
  });
}
