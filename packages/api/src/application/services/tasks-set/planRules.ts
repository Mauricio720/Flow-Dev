import { findAfterProblem, normalizeAfter, startedAfterChanged } from "./planAfterRules";
import { findOrderProblem, indexTasks, normalizeOrder } from "./planOrder";
import type { PlanItemDraft, PlanValidation, PlanValidationInput, StoredPlanItem } from "./planTypes";

export const MAX_PLAN_SESSIONS = 30;
export const MAX_TASKS_PER_SESSION = 30;

function sameChoice(left: PlanItemDraft["choice"], right: PlanItemDraft["choice"]) {
  return left.agent === right.agent && left.model === right.model && left.effort === right.effort;
}

function sameTasks(left: string[], right: string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((taskId, position) => taskId === sortedRight[position]);
}

function startedItemChanged(stored: StoredPlanItem[], drafts: PlanItemDraft[]) {
  return stored.filter((item) => item.started).some((item) => {
    const draft = drafts.find((candidate) => candidate.id === item.id);
    return !draft || !sameTasks(draft.taskIds, item.taskIds) || !sameChoice(draft.choice, item.choice);
  });
}

function exceedsLimits(drafts: PlanItemDraft[]) {
  return drafts.length > MAX_PLAN_SESSIONS || drafts.some((draft) => draft.taskIds.length > MAX_TASKS_PER_SESSION);
}

function hasDuplicate(drafts: PlanItemDraft[]) {
  const all = drafts.flatMap((draft) => draft.taskIds);
  return new Set(all).size !== all.length;
}

function hasUnknown({ set, stored, drafts }: PlanValidationInput) {
  const known = new Set([...set.tasks.map((task) => task.id), ...stored.filter((item) => item.started).flatMap((item) => item.taskIds)]);
  return drafts.some((draft) => draft.taskIds.some((taskId) => !known.has(taskId)));
}

export function validatePlan(input: PlanValidationInput): PlanValidation {
  const { set, stored, drafts } = input;
  if (startedItemChanged(stored, drafts) || startedAfterChanged(stored, drafts)) return { error: "plan_item_started" };
  if (exceedsLimits(drafts)) return { error: "plan_limits" };
  if (hasDuplicate(drafts)) return { error: "plan_task_duplicated" };
  if (hasUnknown(input)) return { error: "plan_task_unknown" };
  const index = indexTasks(set.tasks);
  const ordered = drafts.map((draft) => ({ ...draft, id: stored.some((item) => item.id === draft.id) ? draft.id : undefined, taskIds: normalizeOrder(draft.taskIds, index), after: normalizeAfter(draft.after) }));
  const message = findOrderProblem(ordered, index);
  if (message) return { error: "plan_invalid_order", message };
  const afterMessage = findAfterProblem(ordered);
  return afterMessage ? { error: "plan_after_order", message: afterMessage } : { items: ordered };
}
