import type { PlanItemDraft } from "./planTypes";
import type { TaskSetTask } from "./taskSetTypes";

export type TaskIndex = ReadonlyMap<string, TaskSetTask>;

const TASK_ID_PREFIX = "task_";

export function indexTasks(tasks: TaskSetTask[]): TaskIndex {
  return new Map(tasks.map((task) => [task.id, task]));
}

function numberOf(taskId: string, index: TaskIndex) {
  return index.get(taskId)?.number ?? taskId.slice(TASK_ID_PREFIX.length);
}

export function normalizeOrder(taskIds: string[], index: TaskIndex): string[] {
  const pending = new Set(taskIds);
  const ordered: string[] = [];
  while (pending.size > 0) {
    const ready = [...pending].filter((id) => (index.get(id)?.dependsOn ?? []).every((dependency) => !pending.has(dependency))).sort();
    const next = ready[0] ?? [...pending].sort()[0]!;
    pending.delete(next);
    ordered.push(next);
  }
  return ordered;
}

function sessionPositions(drafts: PlanItemDraft[]) {
  const positions = new Map<string, number>();
  drafts.forEach((draft, position) => draft.taskIds.forEach((taskId) => positions.set(taskId, position)));
  return positions;
}

export function findOrderProblem(drafts: PlanItemDraft[], index: TaskIndex): string | null {
  const positions = sessionPositions(drafts);
  for (const [position, draft] of drafts.entries()) {
    for (const taskId of draft.taskIds) {
      const later = (index.get(taskId)?.dependsOn ?? []).find((dependency) => (positions.get(dependency) ?? -1) > position);
      if (later) return `A tarefa ${numberOf(taskId, index)} depende da ${numberOf(later, index)}, que está numa sessão posterior.`;
    }
  }
  return null;
}
