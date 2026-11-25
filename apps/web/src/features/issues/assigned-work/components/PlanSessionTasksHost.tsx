import type { EditablePlan } from "../planContract";
import type { PlanSelectionDialogState } from "../hooks/usePlanSelectionDialog";
import type { TaskItem } from "../taskSetContract";
import { PlanSessionTasksDialog } from "./PlanSessionTasksDialog";

type Props = {
  selection: PlanSelectionDialogState;
  plan: EditablePlan;
  tasks: TaskItem[];
  onSetTasks: (key: string, taskIds: string[]) => void;
  onCreateSession: (taskIds: string[]) => void;
};

export function PlanSessionTasksHost({ selection, plan, tasks, onSetTasks, onCreateSession }: Props) {
  const { target } = selection;
  if (!target) return null;
  const apply = (taskIds: string[]) => (target.kind === "new" ? onCreateSession(taskIds) : onSetTasks(target.key, taskIds));
  return <PlanSessionTasksDialog target={target} plan={plan} tasks={tasks} trigger={selection.trigger} onApply={apply} onClose={selection.close} />;
}
