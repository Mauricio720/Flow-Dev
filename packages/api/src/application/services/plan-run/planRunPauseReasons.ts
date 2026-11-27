import type { PlanItemView } from "../tasks-set/planView";
import type { TaskSet } from "../tasks-set/taskSetTypes";
import { remainingTasks } from "../tasks-set/planReadiness";

const FIRST_POSITION = 1;
const TRAILING_PERIOD = /\.$/;

export const NOTHING_TO_START = "Nenhuma sessão pode começar.";

export function taskNumber(set: TaskSet, taskId: string) {
  return set.tasks.find((task) => task.id === taskId)?.number ?? taskId;
}

export function unfinishedMessage(position: number, openNumbers: string[]) {
  return `A Sessão ${position} terminou com tarefas não concluídas: ${openNumbers.join(", ")}.`;
}

export function launchFailedMessage(position: number, launchError: string | null) {
  return `A Sessão ${position} falhou ao abrir: ${(launchError ?? "motivo desconhecido").replace(TRAILING_PERIOD, "")}.`;
}

export function launchRefusedMessage(position: number, reason: string) {
  return `Não foi possível iniciar a Sessão ${position}. ${reason}`;
}

export function openTaskNumbers(item: PlanItemView, set: TaskSet) {
  return remainingTasks(item, set).map((taskId) => taskNumber(set, taskId));
}

function waitSentence(item: PlanItemView, context: { items: PlanItemView[]; set: TaskSet }) {
  const tasks = item.blockedBy.map((blocker) => taskNumber(context.set, blocker.taskId));
  const sessions = item.waitingSessions.map((id) => `a Sessão ${context.items.findIndex((candidate) => candidate.id === id) + FIRST_POSITION}`);
  const waits = [...(tasks.length > 0 ? [tasks.join(", ")] : []), ...sessions];
  return `aguarda ${waits.join(" e ")}.`;
}

function missingSentence(item: PlanItemView, position: number, context: { items: PlanItemView[]; set: TaskSet }) {
  if (item.state === "ended") return `A Sessão ${position} foi encerrada com tarefas não concluídas.`;
  if (item.state === "blocked") return `A Sessão ${position} ${waitSentence(item, context)}`;
  return null;
}

export function nothingToStartMessage(items: PlanItemView[], set: TaskSet) {
  const sentences = items.flatMap((item, index) => missingSentence(item, index + FIRST_POSITION, { items, set }) ?? []);
  return [NOTHING_TO_START, ...sentences].join(" ");
}
