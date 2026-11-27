import type { EditableItem, EditablePlan } from "../planContract";
import { AFTER_LEGEND, sessionTitle } from "../planCopy";

type Props = { item: EditableItem; position: number; plan: EditablePlan; onChange: (after: string[]) => void };

export function PlanSessionAfterField({ item, position, plan, onChange }: Props) {
  const earlier = plan.items.slice(0, position - 1);
  if (earlier.length === 0) return null;
  const toggle = (key: string) => onChange(item.after.includes(key) ? item.after.filter((after) => after !== key) : [...item.after, key]);
  return (
    <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      <legend className="mb-1 text-xs font-medium text-ink-2">{AFTER_LEGEND}</legend>
      {earlier.map((candidate, index) => (
        <label key={candidate.key} className="flex items-center gap-1.5 text-ink">
          <input type="checkbox" checked={item.after.includes(candidate.key)} onChange={() => toggle(candidate.key)} />
          {sessionTitle(index + 1)}
        </label>
      ))}
    </fieldset>
  );
}
