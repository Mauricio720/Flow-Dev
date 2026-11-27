"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import type { EditablePlan, SelectionTarget } from "../planContract";
import { APPLY_LABEL, CANCEL_LABEL, sessionTasksTitle } from "../planCopy";
import { placeOf } from "../planSelectionModel";
import type { TaskItem } from "../taskSetContract";
import { PlanSessionTaskChoice } from "./PlanSessionTaskChoice";

const TITLE_ID = "plan-session-tasks-title";

type Props = {
  target: SelectionTarget;
  plan: EditablePlan;
  tasks: TaskItem[];
  trigger: React.RefObject<HTMLButtonElement | null>;
  onApply: (taskIds: string[]) => void;
  onClose: () => void;
};

function initialChecked(plan: EditablePlan, tasks: TaskItem[], target: SelectionTarget) {
  return tasks.map((task) => task.id).filter((taskId) => {
    const place = placeOf(plan, taskId);
    return place.kind === "item" && place.key === target.key;
  });
}

export function PlanSessionTasksDialog({ target, plan, tasks, trigger, onApply, onClose }: Props) {
  const [checked, setChecked] = useState(() => initialChecked(plan, tasks, target));
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const close = () => {
    onClose();
    requestAnimationFrame(() => trigger.current?.focus());
  };
  useDialogFocus(true, false, close, { trigger, dialog, heading });
  const toggle = (taskId: string) => setChecked((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]));
  return (
    <dialog ref={dialog} open aria-modal="true" aria-labelledby={TITLE_ID} className="fixed inset-0 z-50 m-0 flex min-h-full w-full max-w-none items-center justify-center border-0 bg-black/40 p-3 backdrop:bg-black/40 sm:p-6">
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-2xl space-y-5 overflow-y-auto rounded-xl border border-line bg-raised p-5 text-ink shadow-raised sm:p-6">
        <h2 id={TITLE_ID} ref={heading} tabIndex={-1} className="text-lg font-semibold">{sessionTasksTitle(target.position)}</h2>
        <ul className="divide-y divide-line rounded-md border border-line">
          {tasks.map((task) => <PlanSessionTaskChoice key={task.id} task={task} place={placeOf(plan, task.id)} checked={checked.includes(task.id)} onToggle={() => toggle(task.id)} />)}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>{CANCEL_LABEL}</Button>
          <Button type="button" onClick={() => { onApply(checked); close(); }}>{APPLY_LABEL}</Button>
        </div>
      </section>
    </dialog>
  );
}
