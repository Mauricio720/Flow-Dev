import type { EditablePlan, MoveTarget } from "../planContract";
import { NEW_SESSION_LABEL, NO_SESSION_LABEL, sessionTitle, taskSelectLabel } from "../planCopy";
import { sessionOf } from "../planEditorModel";

type Props = { task: { id: string; number: string }; plan: EditablePlan; onMove: (target: MoveTarget) => void };

const NONE_VALUE = "none";
const NEW_VALUE = "new";
const ITEM_PREFIX = "item:";

function valueOf(target: MoveTarget) {
  if (target.kind === "item") return `${ITEM_PREFIX}${target.key}`;
  return target.kind === "new" ? NEW_VALUE : NONE_VALUE;
}

function targetOf(value: string): MoveTarget {
  if (value.startsWith(ITEM_PREFIX)) return { kind: "item", key: value.slice(ITEM_PREFIX.length) };
  return value === NEW_VALUE ? { kind: "new" } : { kind: "none" };
}

export function PlanTaskSessionSelect({ task, plan, onMove }: Props) {
  return (
    <select aria-label={taskSelectLabel(task.number)} value={valueOf(sessionOf(plan, task.id))} onChange={(event) => onMove(targetOf(event.target.value))} className="h-8 rounded-md border border-line bg-surface px-2 text-xs text-ink-2">
      <option value={NONE_VALUE}>{NO_SESSION_LABEL}</option>
      {plan.items.map((item, index) => (item.started ? null : <option key={item.key} value={`${ITEM_PREFIX}${item.key}`}>{sessionTitle(index + 1)}</option>))}
      <option value={NEW_VALUE}>{NEW_SESSION_LABEL}</option>
    </select>
  );
}
