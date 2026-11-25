import type { TaskPlace } from "../planSelectionModel";
import { NO_SESSION_LABEL, inSessionText, startedPlaceText, taskChoiceLabel } from "../planCopy";
import type { TaskItem } from "../taskSetContract";

type Props = { task: TaskItem; place: TaskPlace; checked: boolean; onToggle: () => void };

function placeText(place: TaskPlace) {
  if (place.kind === "none") return NO_SESSION_LABEL;
  return place.started ? startedPlaceText(place.position) : inSessionText(place.position);
}

export function PlanSessionTaskChoice({ task, place, checked, onToggle }: Props) {
  const placeId = `plan-task-place-${task.id}`;
  const locked = place.kind === "item" && place.started;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <label className="flex min-w-0 items-baseline gap-3 text-ink [overflow-wrap:anywhere]">
        <input type="checkbox" checked={checked} disabled={locked} aria-describedby={placeId} onChange={onToggle} className="size-4 shrink-0 translate-y-0.5 accent-primary disabled:opacity-40" />
        {taskChoiceLabel(task.number ?? task.id, task.title ?? task.id)}
      </label>
      <span id={placeId} className="text-xs text-ink-3">{placeText(place)}</span>
    </li>
  );
}
