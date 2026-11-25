import { DEFAULT_CHOICE } from "./launchPurposeModel";
import type { EditableItem, EditablePlan, MoveTarget, PlanSaveInput, PlanView } from "./planContract";
import type { AgentChoice } from "./terminalContract";

const NEW_KEY_PREFIX = "new-";

export function toEditable(view: PlanView): EditablePlan {
  const items = view.items.map((item) => ({ key: item.id, id: item.id, taskIds: item.taskIds, choice: item.choice, started: item.started }));
  return { version: view.version, items };
}

export function nextKey(plan: EditablePlan) {
  const used = plan.items.filter((item) => item.key.startsWith(NEW_KEY_PREFIX)).map((item) => Number(item.key.slice(NEW_KEY_PREFIX.length)));
  return `${NEW_KEY_PREFIX}${Math.max(0, ...used) + 1}`;
}

export function assignedIds(plan: EditablePlan) {
  return new Set(plan.items.flatMap((item) => item.taskIds));
}

function startedPart(plan: EditablePlan) {
  return plan.items.filter((item) => item.started);
}

function freshTasks(plan: EditablePlan, taskIds: string[]) {
  const taken = new Set(startedPart(plan).flatMap((item) => item.taskIds));
  return taskIds.filter((taskId) => !taken.has(taskId));
}

function rebuilt(plan: EditablePlan, groups: string[][]): EditablePlan {
  const base: EditablePlan = { version: plan.version, items: startedPart(plan) };
  return groups.reduce((current, group) => ({ ...current, items: [...current.items, { key: nextKey(current), taskIds: group, choice: DEFAULT_CHOICE, started: false }] }), base);
}

export function allInOne(plan: EditablePlan, taskIds: string[]): EditablePlan {
  const fresh = freshTasks(plan, taskIds);
  return rebuilt(plan, fresh.length > 0 ? [fresh] : []);
}

export function onePerTask(plan: EditablePlan, taskIds: string[]): EditablePlan {
  return rebuilt(plan, freshTasks(plan, taskIds).map((taskId) => [taskId]));
}

export function sameChoiceForAll(plan: EditablePlan, choice: AgentChoice): EditablePlan {
  return { ...plan, items: plan.items.map((item) => (item.started ? item : { ...item, choice })) };
}

export function setChoice(plan: EditablePlan, input: { key: string; choice: AgentChoice }): EditablePlan {
  return { ...plan, items: plan.items.map((item) => (item.key === input.key && !item.started ? { ...item, choice: input.choice } : item)) };
}

export function sessionOf(plan: EditablePlan, taskId: string): MoveTarget {
  const holder = plan.items.find((item) => item.taskIds.includes(taskId));
  return holder ? { kind: "item", key: holder.key } : { kind: "none" };
}

function without(items: EditableItem[], taskId: string) {
  return items.map((item) => (item.started ? item : { ...item, taskIds: item.taskIds.filter((id) => id !== taskId) })).filter((item) => item.started || item.taskIds.length > 0);
}

function added(items: EditableItem[], input: { taskId: string; target: MoveTarget; fresh: string }): EditableItem[] {
  const { taskId, target, fresh } = input;
  if (target.kind === "none") return items;
  if (target.kind === "new") return [...items, { key: fresh, taskIds: [taskId], choice: DEFAULT_CHOICE, started: false }];
  return items.map((item) => (item.key === target.key ? { ...item, taskIds: [...item.taskIds, taskId].sort() } : item));
}

export function moveTask(plan: EditablePlan, taskId: string, target: MoveTarget): EditablePlan {
  const holder = plan.items.find((item) => item.taskIds.includes(taskId));
  const destination = target.kind === "item" ? plan.items.find((item) => item.key === target.key) : null;
  if (holder?.started || destination?.started) return plan;
  return { ...plan, items: added(without(plan.items, taskId), { taskId, target, fresh: nextKey(plan) }) };
}

export function toSaveInput(plan: EditablePlan): Pick<PlanSaveInput, "version" | "items"> {
  return { version: plan.version, items: plan.items.map((item) => ({ ...(item.id ? { id: item.id } : {}), taskIds: item.taskIds, choice: item.choice })) };
}
