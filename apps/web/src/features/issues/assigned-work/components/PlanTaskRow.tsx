import { Button } from "@/components/ui/button";
import { REMOVE_FROM_SESSION_LABEL } from "../planCopy";
import { writeDrag } from "../planDragData";
import type { TaskItem } from "../taskSetContract";

type Props = { taskId: string; tasks: TaskItem[]; editable: boolean; onRemove?: (taskId: string) => void };

export function PlanTaskRow({ taskId, tasks, editable, onRemove }: Props) {
  const task = tasks.find((candidate) => candidate.id === taskId);
  const number = task?.number ?? taskId;
  return (
    <li draggable={editable} onDragStart={editable ? (event) => writeDrag(event, { kind: "task", taskId }) : undefined} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-baseline gap-3">
        <span className="font-mono text-[13px] tabular-nums text-ink-3">{number}</span>
        <span className="text-ink [overflow-wrap:anywhere]">{task?.title ?? taskId}</span>
      </span>
      {editable && onRemove ? <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(taskId)}>{REMOVE_FROM_SESSION_LABEL}</Button> : null}
    </li>
  );
}
