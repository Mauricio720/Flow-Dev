import type { EditableItem, EditablePlan } from "./planContract";
import { NO_SESSION_PLACE, afterText, sessionTitle, waitTasksText } from "./planCopy";
import type { TaskItem } from "./taskSetContract";

const FIRST_POSITION = 1;
const COMPLETED = "completed";

function positionOf(plan: EditablePlan, key: string) {
  return plan.items.findIndex((item) => item.key === key) + FIRST_POSITION;
}

export function startsAfterText(item: EditableItem, plan: EditablePlan) {
  const sessions = item.after.map((key) => positionOf(plan, key)).filter((position) => position >= FIRST_POSITION).sort((left, right) => left - right);
  return sessions.length > 0 ? afterText(sessions.map(sessionTitle)) : null;
}

function placesText(positions: (number | null)[]) {
  const sessions = [...new Set(positions.filter((position): position is number => position !== null))].sort((left, right) => left - right);
  const parts = sessions.length > 1 ? [`Sessões ${sessions.slice(0, -1).join(", ")} e ${sessions.at(-1)}`] : sessions.map(sessionTitle);
  return [...parts, ...(positions.includes(null) ? [NO_SESSION_PLACE] : [])].join(" e ");
}

export function waitsForTasksText(item: EditableItem, plan: EditablePlan, tasks: TaskItem[]) {
  const inside = new Set(item.taskIds);
  const dependencies = [...new Set(item.taskIds.flatMap((taskId) => tasks.find((task) => task.id === taskId)?.dependsOn ?? []))];
  const open = dependencies.filter((taskId) => !inside.has(taskId) && tasks.find((task) => task.id === taskId)?.status !== COMPLETED).sort();
  if (open.length === 0) return null;
  const numbers = open.map((taskId) => tasks.find((task) => task.id === taskId)?.number ?? taskId);
  const positions = open.map((taskId) => {
    const position = plan.items.findIndex((candidate) => candidate.taskIds.includes(taskId)) + FIRST_POSITION;
    return position >= FIRST_POSITION ? position : null;
  });
  return waitTasksText(numbers, placesText(positions));
}
