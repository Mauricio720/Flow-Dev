import type { TaskItem } from "../taskSetContract";
import { TASKS_LIST_LABEL, TASK_COLUMNS } from "../taskSetCopy";
import { TASK_GRID, TaskRow } from "./TaskRow";

type Props = { tasks: TaskItem[]; openId: string | null; onOpen: (artifactId: string) => void };

function ColumnHeader() {
  return (
    <div aria-hidden="true" className={`${TASK_GRID} hidden border-b border-line px-4 py-2 text-xs text-ink-3 sm:grid`}>
      <span>#</span>
      <span>{TASK_COLUMNS.task}</span>
      <span>{TASK_COLUMNS.area}</span>
      <span>{TASK_COLUMNS.dependsOn}</span>
      <span>{TASK_COLUMNS.mini}</span>
      <span>{TASK_COLUMNS.status}</span>
    </div>
  );
}

export function TaskList({ tasks, openId, onOpen }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <ColumnHeader />
      <ul aria-label={TASKS_LIST_LABEL} className="divide-y divide-line">
        {tasks.map((task) => <li key={task.id}><TaskRow task={task} open={task.artifactId !== null && task.artifactId === openId} onOpen={onOpen} /></li>)}
      </ul>
    </div>
  );
}
