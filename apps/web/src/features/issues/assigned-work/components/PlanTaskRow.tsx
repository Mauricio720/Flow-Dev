import type { EditablePlan, MoveTarget } from "../planContract";
import type { TaskItem } from "../taskSetContract";
import { PlanTaskSessionSelect } from "./PlanTaskSessionSelect";

type Props = { taskId: string; tasks: TaskItem[]; plan: EditablePlan; editable: boolean; onMove: (taskId: string, target: MoveTarget) => void };

export function PlanTaskRow({ taskId, tasks, plan, editable, onMove }: Props) {
  const task = tasks.find((candidate) => candidate.id === taskId);
  const number = task?.number ?? taskId;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-baseline gap-3">
        <span className="font-mono text-[13px] tabular-nums text-ink-3">{number}</span>
        <span className="text-ink [overflow-wrap:anywhere]">{task?.title ?? taskId}</span>
      </span>
      {editable ? <PlanTaskSessionSelect task={{ id: taskId, number }} plan={plan} onMove={(target) => onMove(taskId, target)} /> : null}
    </li>
  );
}
