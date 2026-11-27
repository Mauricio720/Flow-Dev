import type { EditablePlan } from "../planContract";
import type { PlanSelectionDialogState } from "../hooks/usePlanSelectionDialog";
import type { TaskItem } from "../taskSetContract";
import { PlanSessionTasksDialog } from "./PlanSessionTasksDialog";

type Props = { selection: PlanSelectionDialogState; plan: EditablePlan; tasks: TaskItem[]; onSetTasks: (key: string, taskIds: string[]) => void };

export function PlanSessionTasksHost({ selection, plan, tasks, onSetTasks }: Props) {
  const { target } = selection;
  if (!target) return null;
  return <PlanSessionTasksDialog target={target} plan={plan} tasks={tasks} trigger={selection.trigger} onApply={(taskIds) => onSetTasks(target.key, taskIds)} onClose={selection.close} />;
}
