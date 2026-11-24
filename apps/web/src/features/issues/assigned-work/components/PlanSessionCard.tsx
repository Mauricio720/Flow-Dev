import type { ReactNode } from "react";
import type { EditableItem, EditablePlan, MoveTarget } from "../planContract";
import { STARTED_NOTE, sessionTitle } from "../planCopy";
import type { TaskItem } from "../taskSetContract";
import type { AgentChoice, AgentOption } from "../terminalContract";
import { AgentChoiceField } from "./AgentChoiceField";
import { PlanTaskRow } from "./PlanTaskRow";

type Props = {
  position: number;
  item: EditableItem;
  plan: EditablePlan;
  tasks: TaskItem[];
  agents: AgentOption[];
  canEdit: boolean;
  onMove: (taskId: string, target: MoveTarget) => void;
  onChoice: (choice: AgentChoice) => void;
  children?: ReactNode;
};

export function PlanSessionCard({ position, item, plan, tasks, agents, canEdit, onMove, onChoice, children }: Props) {
  const editable = canEdit && !item.started;
  return (
    <li className="overflow-hidden rounded-xl border border-line bg-raised">
      <div className="space-y-4 p-4">
        <h3 className="text-[15px] font-semibold text-ink">{sessionTitle(position)}{item.started ? ` · ${STARTED_NOTE}` : ""}</h3>
        <AgentChoiceField compact agents={agents} value={item.choice} readOnly={!editable} onChange={onChoice} />
        <ul className="divide-y divide-line rounded-md border border-line">{item.taskIds.map((taskId) => <PlanTaskRow key={taskId} taskId={taskId} tasks={tasks} plan={plan} editable={editable} onMove={onMove} />)}</ul>
      </div>
      {children}
    </li>
  );
}
