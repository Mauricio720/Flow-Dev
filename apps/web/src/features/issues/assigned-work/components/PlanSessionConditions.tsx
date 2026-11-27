import type { EditableItem, EditablePlan, PlanItemView } from "../planContract";
import { startsAfterText, waitsForTasksText } from "../planConditionsModel";
import type { TaskItem } from "../taskSetContract";
import { PlanSessionAfterField } from "./PlanSessionAfterField";

type Props = { item: EditableItem; position: number; plan: EditablePlan; tasks: TaskItem[]; saved: PlanItemView | undefined; editable: boolean; onAfter: (after: string[]) => void };

const DONE_STATE = "done";

export function PlanSessionConditions({ item, position, plan, tasks, saved, editable, onAfter }: Props) {
  if (saved?.state === DONE_STATE) return null;
  const texts = [startsAfterText(item, plan), waitsForTasksText(item, plan, tasks)].filter((text): text is string => text !== null);
  return (
    <div className="space-y-2">
      {editable ? <PlanSessionAfterField item={item} position={position} plan={plan} onChange={onAfter} /> : null}
      {texts.map((text) => <p key={text} className="text-xs text-ink-2">{text}</p>)}
    </div>
  );
}
