import type { ReactNode } from "react";
import type { PlanEditHandlers } from "../planEditHandlers";
import type { EditableItem } from "../planContract";
import { EMPTY_SESSION_TEXT, STARTED_NOTE, sessionTitle } from "../planCopy";
import { dropTargetProps, writeDrag } from "../planDragData";
import type { TaskItem } from "../taskSetContract";
import type { AgentOption } from "../terminalContract";
import { AgentChoiceField } from "./AgentChoiceField";
import { PlanSessionOrderActions } from "./PlanSessionOrderActions";
import { PlanTaskRow } from "./PlanTaskRow";
import { SessionAccountLabel } from "./SessionAccountLabel";

type Props = {
  position: number;
  total: number;
  item: EditableItem;
  tasks: TaskItem[];
  agents: AgentOption[];
  canEdit: boolean;
  edits: PlanEditHandlers;
  onChooseTasks: (button: HTMLButtonElement) => void;
  conditions?: ReactNode;
  children?: ReactNode;
};

export function PlanSessionCard({ position, total, item, tasks, agents, canEdit, edits, onChooseTasks, conditions, children }: Props) {
  const editable = canEdit && !item.started;
  const drop = editable ? dropTargetProps((payload) => (payload.kind === "task" ? edits.move(payload.taskId, { kind: "item", key: item.key }) : edits.moveSession(payload.key, position))) : {};
  return (
    <li aria-label={sessionTitle(position)} draggable={editable} onDragStart={editable ? (event) => writeDrag(event, { kind: "session", key: item.key }) : undefined} {...drop} className="overflow-hidden rounded-xl border border-line bg-raised">
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-ink">{sessionTitle(position)}{item.started ? ` · ${STARTED_NOTE}` : ""}</h3>
          {editable ? <PlanSessionOrderActions position={position} total={total} onMove={(to) => edits.moveSession(item.key, to)} onRemove={() => edits.removeSession(item.key)} onChooseTasks={onChooseTasks} /> : null}
        </div>
        <AgentChoiceField compact agents={agents} value={item.choice} readOnly={!editable} onChange={(choice) => edits.choose(item.key, choice)} />
        <SessionAccountLabel agent={item.choice.agent} />
        {conditions}
        {item.taskIds.length === 0 && !item.started ? <p className="text-sm text-ink-2">{EMPTY_SESSION_TEXT}</p> : <ul className="divide-y divide-line rounded-md border border-line">{item.taskIds.map((taskId) => <PlanTaskRow key={taskId} taskId={taskId} tasks={tasks} editable={editable} onRemove={edits.removeTask} />)}</ul>}
      </div>
      {children}
    </li>
  );
}
