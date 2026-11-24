import { isActiveSession } from "../../terminal/terminalSessionStatus";
import { indexTasks } from "./planOrder";
import type { PlanItemState, StoredPlanItem } from "./planTypes";
import type { TaskSet, TaskStatus } from "./taskSetTypes";

export type BlockedBy = { taskId: string; status: TaskStatus };
export type ItemReadiness = { state: PlanItemState; blockedBy: BlockedBy[] };

const COMPLETED: TaskStatus = "completed";
const ENDED_STATUS = "ended";
const NO_BLOCKERS: BlockedBy[] = [];

export function remainingTasks(item: Pick<StoredPlanItem, "taskIds">, set: TaskSet): string[] {
  const index = indexTasks(set.tasks);
  return item.taskIds.filter((taskId) => index.has(taskId) && index.get(taskId)?.status !== COMPLETED);
}

function externalBlockers(item: StoredPlanItem, set: TaskSet): BlockedBy[] {
  const index = indexTasks(set.tasks);
  const inside = new Set(item.taskIds);
  const open = new Map<string, TaskStatus>();
  for (const taskId of item.taskIds) {
    for (const dependency of index.get(taskId)?.dependsOn ?? []) {
      const status = index.get(dependency)?.status ?? "unknown";
      if (!inside.has(dependency) && status !== COMPLETED) open.set(dependency, status);
    }
  }
  return [...open].sort(([left], [right]) => left.localeCompare(right)).map(([taskId, status]) => ({ taskId, status }));
}

function hasEnded(item: StoredPlanItem) {
  const latest = item.latestSession;
  if (!latest) return false;
  return latest.status === ENDED_STATUS || (item.started && !isActiveSession(latest.status));
}

export function itemReadiness(item: StoredPlanItem, set: TaskSet): ItemReadiness {
  if (remainingTasks(item, set).length === 0) return { state: "done", blockedBy: NO_BLOCKERS };
  if (item.latestSession && isActiveSession(item.latestSession.status)) return { state: "running", blockedBy: NO_BLOCKERS };
  const blockedBy = externalBlockers(item, set);
  if (hasEnded(item)) return { state: "ended", blockedBy };
  return { state: blockedBy.length > 0 ? "blocked" : "ready", blockedBy };
}
