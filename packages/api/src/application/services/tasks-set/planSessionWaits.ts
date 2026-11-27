import { indexTasks } from "./planOrder";
import type { StoredPlanItem } from "./planTypes";
import type { TaskSet, TaskStatus } from "./taskSetTypes";

export type ReadinessContext = { set: TaskSet; items: StoredPlanItem[] };

const COMPLETED: TaskStatus = "completed";

export function remainingTasks(item: Pick<StoredPlanItem, "taskIds">, set: TaskSet): string[] {
  const index = indexTasks(set.tasks);
  return item.taskIds.filter((taskId) => index.has(taskId) && index.get(taskId)?.status !== COMPLETED);
}

export function isEmptyItem(item: Pick<StoredPlanItem, "taskIds" | "started">) {
  return !item.started && item.taskIds.length === 0;
}

export function isConcluded(item: Pick<StoredPlanItem, "taskIds" | "started">, set: TaskSet) {
  return !isEmptyItem(item) && remainingTasks(item, set).length === 0;
}

export function waitingSessionsOf(item: StoredPlanItem, { set, items }: ReadinessContext): string[] {
  const byId = new Map(items.map((candidate) => [candidate.id, candidate]));
  return item.after.filter((targetId) => {
    const target = byId.get(targetId);
    return target !== undefined && !isConcluded(target, set);
  });
}
