import type { MouseEvent } from "react";
import { TaskLabels } from "@/components/tasks/TaskLabels";
import { TASK_STATUS_INK, TASK_STATUS_LABEL, TASK_STATUS_NODE } from "@/components/tasks/taskStatus";
import { projectTaskPath } from "@/lib/navigation/projectRoutes";
import type { TaskSummary } from "../contract";
import { PLANNING_STATUS_LABEL } from "../planningCopy";

const UNTITLED = "Tarefa sem título";
const UNKNOWN_AUTHOR = "Autoria não identificada";
const NODE_BASE = "absolute top-[15px] left-[19px] size-2.5 -translate-x-1/2";

type Props = { task: TaskSummary; active: boolean; onSelect: (taskId: string) => void };

export function HistoryEntry({ task, active, onSelect }: Props) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onSelect(task.id);
  }
  return (
    <li className="relative">
      <a href={projectTaskPath(task.projectId, task.id)} onClick={open} aria-current={active ? "page" : undefined} className={`relative block w-full rounded-lg py-2 pr-3 pl-9 text-left transition-colors ${active ? "bg-raised shadow-raised" : "hover:bg-ink/[0.04]"}`}>
        <span aria-hidden="true" className={`${NODE_BASE} ${TASK_STATUS_NODE[task.status]}`} />
        <span className={`block truncate text-sm ${active ? "font-medium text-ink" : "text-ink-2"}`}>{task.title || UNTITLED}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-3">{task.authorName ?? UNKNOWN_AUTHOR}</span>
        <span className={`mt-0.5 block text-xs ${TASK_STATUS_INK[task.status]}`}>{TASK_STATUS_LABEL[task.status]}{task.planningStatus && task.planningStatus in PLANNING_STATUS_LABEL && <> · {PLANNING_STATUS_LABEL[task.planningStatus]}</>}</span>
        {task.labels.length > 0 && <TaskLabels labels={task.labels} className="mt-1.5" />}
      </a>
    </li>
  );
}
