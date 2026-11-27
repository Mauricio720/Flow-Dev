import { formatTimeOfDay } from "@/lib/tasks/formatMoment";
import type { PlanItemView } from "./planContract";
import { DONE_STATE, EMPTY_STATE, READY_STATE, RUNNING_STATE, START_AGAIN_LABEL, START_ANYWAY_LABEL, START_LABEL, blockedStateText, endedStateText, forcedNoteText, sessionTitle, unfinishedText } from "./planCopy";
import type { TaskItem } from "./taskSetContract";
import { TASK_STATUS_LABEL } from "./taskSetCopy";

const TASK_ID_PREFIX = "task_";

export type LaunchAction = { label: string; force: boolean };

export const numberOfTask = (taskId: string) => (taskId.startsWith(TASK_ID_PREFIX) ? taskId.slice(TASK_ID_PREFIX.length) : taskId);

export function blockedNumbers(item: Pick<PlanItemView, "blockedBy">) {
  return item.blockedBy.map((blocker) => numberOfTask(blocker.taskId));
}

export function waitingSessionLabels(item: Pick<PlanItemView, "waitingSessions">, items: Pick<PlanItemView, "id">[]) {
  return item.waitingSessions.flatMap((id) => {
    const index = items.findIndex((candidate) => candidate.id === id);
    return index >= 0 ? [sessionTitle(index + 1)] : [];
  });
}

export function forceWaits(item: PlanItemView, items: Pick<PlanItemView, "id">[]) {
  return [...blockedNumbers(item), ...waitingSessionLabels(item, items)];
}

function unfinishedCount(item: PlanItemView, tasks: TaskItem[]) {
  return item.taskIds.filter((taskId) => tasks.some((task) => task.id === taskId && task.status !== "completed")).length;
}

export function planStateText(item: PlanItemView, tasks: TaskItem[], items: Pick<PlanItemView, "id">[] = []): string {
  if (item.state === "empty") return EMPTY_STATE;
  if (item.state === "blocked") return blockedStateText([...item.blockedBy.map((blocker) => `${numberOfTask(blocker.taskId)} (${TASK_STATUS_LABEL[blocker.status]})`), ...waitingSessionLabels(item, items)]);
  if (item.state === "ended") return endedStateText(unfinishedText(unfinishedCount(item, tasks)));
  if (item.state === "running") return RUNNING_STATE;
  return item.state === "done" ? DONE_STATE : READY_STATE;
}

export function forcedNote(forced: PlanItemView["forced"]) {
  return forced ? forcedNoteText(forced.by, formatTimeOfDay(forced.at)) : null;
}

export function launchActionOf(item: PlanItemView): LaunchAction | null {
  if (item.state === "ready") return { label: START_LABEL, force: false };
  if (item.state === "blocked") return { label: START_ANYWAY_LABEL, force: true };
  return item.state === "ended" ? { label: START_AGAIN_LABEL, force: item.blockedBy.length > 0 || item.waitingSessions.length > 0 } : null;
}
