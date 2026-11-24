import type { EditablePlan, MoveTarget } from "../planContract";
import { UNASSIGNED_HEADING } from "../planCopy";
import type { TaskItem } from "../taskSetContract";
import { PlanTaskRow } from "./PlanTaskRow";

type Props = { taskIds: string[]; tasks: TaskItem[]; plan: EditablePlan; editable: boolean; onMove: (taskId: string, target: MoveTarget) => void };

export function UnassignedTasks({ taskIds, tasks, plan, editable, onMove }: Props) {
  if (taskIds.length === 0) return null;
  return (
    <section aria-label={UNASSIGNED_HEADING} className="space-y-3 rounded-xl border border-dashed border-line p-4">
      <h3 className="text-[15px] font-semibold text-ink">{UNASSIGNED_HEADING}</h3>
      <ul className="divide-y divide-line rounded-md border border-line">{taskIds.map((taskId) => <PlanTaskRow key={taskId} taskId={taskId} tasks={tasks} plan={plan} editable={editable} onMove={onMove} />)}</ul>
    </section>
  );
}
