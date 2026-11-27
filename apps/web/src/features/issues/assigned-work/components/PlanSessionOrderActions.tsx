import { Button } from "@/components/ui/button";
import { CHOOSE_TASKS_LABEL, MOVE_DOWN_LABEL, MOVE_UP_LABEL, REMOVE_SESSION_LABEL } from "../planCopy";

type Props = { position: number; total: number; onMove: (to: number) => void; onRemove: () => void; onChooseTasks: (button: HTMLButtonElement) => void };

const STEP = 1;
const FIRST_POSITION = 1;

export function PlanSessionOrderActions({ position, total, onMove, onRemove, onChooseTasks }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button type="button" size="sm" variant="secondary" onClick={(event) => onChooseTasks(event.currentTarget)}>{CHOOSE_TASKS_LABEL}</Button>
      <Button type="button" size="sm" variant="ghost" disabled={position === FIRST_POSITION} onClick={() => onMove(position - STEP)}>{MOVE_UP_LABEL}</Button>
      <Button type="button" size="sm" variant="ghost" disabled={position === total} onClick={() => onMove(position + STEP)}>{MOVE_DOWN_LABEL}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onRemove}>{REMOVE_SESSION_LABEL}</Button>
    </div>
  );
}
