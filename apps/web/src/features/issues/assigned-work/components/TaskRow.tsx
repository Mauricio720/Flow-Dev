import { taskLabelTone } from "@/components/tasks/taskLabelTone";
import { Badge } from "@/components/ui/badge";
import type { TimelineState } from "../planningModel";
import type { TaskItem, TaskStatus } from "../taskSetContract";
import { NO_DEPENDENCY_MARK, TASK_COLUMNS, TASK_STATUS_LABEL, complexityText } from "../taskSetCopy";
import { dependencyNumbers, taskRowLabel, taskTitle } from "../taskSetModel";
import { Stop } from "./PlanningTimeline";

export const TASK_GRID = "grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_6.5rem_5rem_3rem_7.5rem]";
const ROW_FRAME = `${TASK_GRID} w-full items-center px-4 py-2.5 text-left`;
const STATUS_STOP: Record<TaskStatus, TimelineState> = { pending: "pending", in_progress: "current", completed: "done", unknown: "pending" };
const STATUS_INK: Record<TaskStatus, string> = { pending: "text-ink-2", in_progress: "text-ink", completed: "text-merge-ink", unknown: "text-ink-3" };

function TaskCells({ task }: { task: TaskItem }) {
  return (
    <>
      <span className="font-mono text-[13px] tabular-nums text-ink-3">{task.number}</span>
      <span className="min-w-0 text-sm font-medium text-ink [overflow-wrap:anywhere]">
        {taskTitle(task)}
        {task.complexity ? <span className="block text-xs font-normal text-ink-3">{complexityText(task.complexity)}</span> : null}
      </span>
      <span className="col-start-2 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
        <span>{task.type ? <Badge variant="label" className={taskLabelTone(task.type)}>{task.type}</Badge> : <span className="text-xs text-ink-3">{NO_DEPENDENCY_MARK}</span>}</span>
        <span className="font-mono text-xs tabular-nums text-ink-2"><span className="font-sans text-ink-3 sm:hidden">{`${TASK_COLUMNS.dependsOn} `}</span>{dependencyNumbers(task)}</span>
        <span className="font-mono text-xs tabular-nums text-ink-2">{`${task.miniDone}/${task.miniTotal}`}</span>
        <span className={`flex items-center gap-2 text-xs font-medium ${STATUS_INK[task.status]}`}><Stop state={STATUS_STOP[task.status]} />{TASK_STATUS_LABEL[task.status]}</span>
      </span>
    </>
  );
}

type Props = { task: TaskItem; open: boolean; onOpen: (artifactId: string) => void };

export function TaskRow({ task, open, onOpen }: Props) {
  const artifactId = task.artifactId;
  if (artifactId === null) return <div className={`${ROW_FRAME} opacity-80`}><TaskCells task={task} /></div>;
  return (
    <button type="button" aria-label={taskRowLabel(task)} aria-pressed={open} onClick={() => onOpen(artifactId)} className={`${ROW_FRAME} transition-colors duration-200 ease-out-expo hover:bg-ink/5 aria-pressed:bg-raised`}>
      <TaskCells task={task} />
    </button>
  );
}
