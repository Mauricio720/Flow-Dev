import type { EditableItem, EditablePlan } from "./planContract";

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

export function setSessionTasks(plan: EditablePlan, input: { key: string; taskIds: string[] }): EditablePlan {
  const target = plan.items.find((item) => item.key === input.key);
  if (!target || target.started) return plan;
  const picked = pickableTasks(plan, input.taskIds);
  const released = releasing(plan.items, picked);
  return { ...plan, items: released.map((item) => (item.key === input.key ? { ...item, taskIds: picked } : item)) };
}
