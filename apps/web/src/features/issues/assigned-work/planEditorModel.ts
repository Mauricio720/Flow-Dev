import { DEFAULT_CHOICE } from "./launchPurposeModel";
import type { EditableItem, EditablePlan, MoveTarget, PlanSaveInput, PlanView } from "./planContract";
import type { AgentChoice } from "./terminalContract";

const NEW_KEY_PREFIX = "new-";
const FIRST_POSITION = 1;

export function toEditable(view: PlanView): EditablePlan {
  const items = view.items.map((item) => ({ key: item.id, id: item.id, taskIds: item.taskIds, choice: item.choice, started: item.started, after: item.after }));
  return { version: view.version, items };
}

export function nextKey(plan: EditablePlan) {
  const used = plan.items.filter((item) => item.key.startsWith(NEW_KEY_PREFIX)).map((item) => Number(item.key.slice(NEW_KEY_PREFIX.length)));
  return `${NEW_KEY_PREFIX}${Math.max(0, ...used) + 1}`;
}

export function emptySession(key: string, taskIds: string[] = []): EditableItem {
  return { key, taskIds, choice: DEFAULT_CHOICE, started: false, after: [] };
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
  return groups.reduce((current, group) => ({ ...current, items: [...current.items, emptySession(nextKey(current), group)] }), base);
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
  return items.map((item) => (item.started ? item : { ...item, taskIds: item.taskIds.filter((id) => id !== taskId) }));
}

function added(items: EditableItem[], taskId: string, target: MoveTarget): EditableItem[] {
  if (target.kind === "none") return items;
  return items.map((item) => (item.key === target.key ? { ...item, taskIds: [...item.taskIds, taskId].sort() } : item));
}

export function moveTask(plan: EditablePlan, taskId: string, target: MoveTarget): EditablePlan {
  const holder = plan.items.find((item) => item.taskIds.includes(taskId));
  const destination = target.kind === "item" ? plan.items.find((item) => item.key === target.key) : null;
  if (holder?.started || destination?.started) return plan;
  if (target.kind === "item" && !destination) return plan;
  return { ...plan, items: added(without(plan.items, taskId), taskId, target) };
}

function afterPositions(item: EditableItem, items: EditableItem[]) {
  return item.after.map((key) => items.findIndex((candidate) => candidate.key === key) + FIRST_POSITION).filter((position) => position >= FIRST_POSITION);
}

export function toSaveInput(plan: EditablePlan): Pick<PlanSaveInput, "version" | "items"> {
  return { version: plan.version, items: plan.items.map((item) => ({ ...(item.id ? { id: item.id } : {}), taskIds: item.taskIds, choice: item.choice, after: afterPositions(item, plan.items) })) };
}
