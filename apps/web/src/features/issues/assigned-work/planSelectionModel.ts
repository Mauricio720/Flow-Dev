import { DEFAULT_CHOICE } from "./launchPurposeModel";
import type { EditableItem, EditablePlan } from "./planContract";
import { nextKey } from "./planEditorModel";

export type TaskPlace = { kind: "none" } | { kind: "item"; key: string; position: number; started: boolean };

const NO_PLACE: TaskPlace = { kind: "none" };

export function placeOf(plan: EditablePlan, taskId: string): TaskPlace {
  const index = plan.items.findIndex((item) => item.taskIds.includes(taskId));
  const holder = plan.items[index];
  if (!holder) return NO_PLACE;
  return { kind: "item", key: holder.key, position: index + 1, started: holder.started };
}

function startedTaskIds(plan: EditablePlan) {
  return new Set(plan.items.filter((item) => item.started).flatMap((item) => item.taskIds));
}

function pickableTasks(plan: EditablePlan, taskIds: string[]) {
  const taken = startedTaskIds(plan);
  return [...new Set(taskIds)].filter((taskId) => !taken.has(taskId)).sort();
}

function releasing(items: EditableItem[], taskIds: string[]) {
  const chosen = new Set(taskIds);
  return items.map((item) => (item.started ? item : { ...item, taskIds: item.taskIds.filter((taskId) => !chosen.has(taskId)) }));
}

function withoutEmptySessions(items: EditableItem[]) {
  return items.filter((item) => item.started || item.taskIds.length > 0);
}

export function setSessionTasks(plan: EditablePlan, input: { key: string; taskIds: string[] }): EditablePlan {
  const target = plan.items.find((item) => item.key === input.key);
  if (!target || target.started) return plan;
  const picked = pickableTasks(plan, input.taskIds);
  const released = releasing(plan.items, picked);
  const filled = released.map((item) => (item.key === input.key ? { ...item, taskIds: picked } : item));
  return { ...plan, items: withoutEmptySessions(filled) };
}

export function createSessionWith(plan: EditablePlan, taskIds: string[]): EditablePlan {
  const picked = pickableTasks(plan, taskIds);
  if (picked.length === 0) return plan;
  const kept = withoutEmptySessions(releasing(plan.items, picked));
  const created: EditableItem = { key: nextKey(plan), taskIds: picked, choice: DEFAULT_CHOICE, started: false };
  return { ...plan, items: [...kept, created] };
}
