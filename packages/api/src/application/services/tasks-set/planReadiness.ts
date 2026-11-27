import { isActiveSession } from "../../terminal/terminalSessionStatus";
import { indexTasks } from "./planOrder";
import { isEmptyItem, remainingTasks, waitingSessionsOf } from "./planSessionWaits";
import type { ReadinessContext } from "./planSessionWaits";
import type { PlanItemState, StoredPlanItem } from "./planTypes";
import type { TaskSet, TaskStatus } from "./taskSetTypes";

export { remainingTasks } from "./planSessionWaits";
export type { ReadinessContext } from "./planSessionWaits";
export type BlockedBy = { taskId: string; status: TaskStatus };
export type ItemReadiness = { state: PlanItemState; blockedBy: BlockedBy[]; waitingSessions: string[] };

const COMPLETED: TaskStatus = "completed";
const ENDED_STATUS = "ended";
const NO_BLOCKERS: BlockedBy[] = [];
const NO_SESSIONS: string[] = [];

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

function settledState(state: PlanItemState): ItemReadiness {
  return { state, blockedBy: NO_BLOCKERS, waitingSessions: NO_SESSIONS };
}

export function itemReadiness(item: StoredPlanItem, context: ReadinessContext): ItemReadiness {
  if (isEmptyItem(item)) return settledState("empty");
  if (remainingTasks(item, context.set).length === 0) return settledState("done");
  if (item.latestSession && isActiveSession(item.latestSession.status)) return settledState("running");
  const blockedBy = externalBlockers(item, context.set);
  const waitingSessions = waitingSessionsOf(item, context);
  if (hasEnded(item)) return { state: "ended", blockedBy, waitingSessions };
  const blocked = blockedBy.length > 0 || waitingSessions.length > 0;
  return { state: blocked ? "blocked" : "ready", blockedBy, waitingSessions };
}
