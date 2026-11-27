import type { EditableItem, EditablePlan } from "./planContract";
import { emptySession, moveTask, nextKey } from "./planEditorModel";

const FIRST_POSITION = 1;

function earlierKeys(items: EditableItem[], key: string) {
  const index = items.findIndex((item) => item.key === key);
  return new Set(items.slice(0, Math.max(index, 0)).map((item) => item.key));
}

function prunedConditions(items: EditableItem[]): EditableItem[] {
  return items.map((item) => {
    if (item.started) return item;
    const earlier = earlierKeys(items, item.key);
    return { ...item, after: item.after.filter((key) => earlier.has(key)) };
  });
}

export function addEmptySession(plan: EditablePlan): EditablePlan {
  return { ...plan, items: [...plan.items, emptySession(nextKey(plan))] };
}

export function removeFromSession(plan: EditablePlan, taskId: string): EditablePlan {
  return moveTask(plan, taskId, { kind: "none" });
}

export function removeSession(plan: EditablePlan, key: string): EditablePlan {
  const target = plan.items.find((item) => item.key === key);
  if (!target || target.started) return plan;
  const kept = plan.items.filter((item) => item.key !== key).map((item) => (item.started ? item : { ...item, after: item.after.filter((after) => after !== key) }));
  return { ...plan, items: kept };
}

export function moveSession(plan: EditablePlan, input: { key: string; to: number }): EditablePlan {
  const from = plan.items.findIndex((item) => item.key === input.key);
  const to = input.to - FIRST_POSITION;
  const moving = plan.items[from];
  if (!moving || moving.started || to < 0 || to >= plan.items.length || to === from) return plan;
  const rest = plan.items.filter((item) => item.key !== input.key);
  return { ...plan, items: prunedConditions([...rest.slice(0, to), moving, ...rest.slice(to)]) };
}

export function setAfter(plan: EditablePlan, input: { key: string; after: string[] }): EditablePlan {
  const earlier = earlierKeys(plan.items, input.key);
  const after = [...new Set(input.after)].filter((key) => earlier.has(key));
  return { ...plan, items: plan.items.map((item) => (item.key === input.key && !item.started ? { ...item, after } : item)) };
}
