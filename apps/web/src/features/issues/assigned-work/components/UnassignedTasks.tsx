import type { MoveTarget } from "../planContract";
import { UNASSIGNED_HEADING } from "../planCopy";
import { dropTargetProps } from "../planDragData";
import type { TaskItem } from "../taskSetContract";
import { PlanTaskRow } from "./PlanTaskRow";

type Props = { taskIds: string[]; tasks: TaskItem[]; editable: boolean; onMove: (taskId: string, target: MoveTarget) => void };

const NO_SESSION: MoveTarget = { kind: "none" };

export function UnassignedTasks({ taskIds, tasks, editable, onMove }: Props) {
  if (taskIds.length === 0) return null;
  const drop = editable ? dropTargetProps((payload) => (payload.kind === "task" ? onMove(payload.taskId, NO_SESSION) : undefined)) : {};
  return (
    <section aria-label={UNASSIGNED_HEADING} {...drop} className="space-y-3 rounded-xl border border-dashed border-line p-4">
      <h3 className="text-[15px] font-semibold text-ink">{UNASSIGNED_HEADING}</h3>
      <ul className="divide-y divide-line rounded-md border border-line">{taskIds.map((taskId) => <PlanTaskRow key={taskId} taskId={taskId} tasks={tasks} editable={editable} />)}</ul>
    </section>
  );
}
