"use client";

import { useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { END_CANCEL_LABEL, END_CONFIRM_LABEL, END_CONFIRM_MESSAGE } from "../sessionCopy";

type Props = { trigger: RefObject<HTMLButtonElement | null>; busy: boolean; onConfirm: () => void; onCancel: () => void };

export function SessionEndConfirm({ trigger, busy, onConfirm, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const cancel = () => {
    onCancel();
    requestAnimationFrame(() => trigger.current?.focus());
  };
  useDialogFocus(true, busy, cancel, { trigger, dialog, heading });
  return (
    <dialog ref={dialog} open aria-modal="true" aria-labelledby="end-title" className="fixed inset-0 z-50 m-0 flex min-h-full w-full max-w-none items-center justify-center border-0 bg-black/40 p-3 backdrop:bg-black/40 sm:p-6">
      <section className="w-full max-w-md space-y-4 rounded-xl border border-line bg-raised p-5 text-ink shadow-raised">
        <h2 id="end-title" ref={heading} tabIndex={-1} className="text-base font-semibold">{END_CONFIRM_MESSAGE}</h2>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={cancel}>{END_CANCEL_LABEL}</Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>{END_CONFIRM_LABEL}</Button>
        </div>
      </section>
    </dialog>
  );
}
