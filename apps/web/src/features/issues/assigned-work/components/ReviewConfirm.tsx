"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { REVIEW_CANCEL_LABEL } from "../reviewCopy";

type Props = { message: string; confirmLabel: string; trigger?: RefObject<HTMLButtonElement | null>; busy?: boolean; destructive?: boolean; onConfirm: () => void; onCancel: () => void };

export function ReviewConfirm({ message, confirmLabel, trigger, busy = false, destructive = false, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const fallbackTrigger = useRef<HTMLButtonElement>(null);
  const cancel = () => {
    onCancel();
    requestAnimationFrame(() => trigger?.current?.focus());
  };
  useDialogFocus(true, busy, cancel, { trigger: trigger ?? fallbackTrigger, dialog, heading });
  useEffect(() => {
    primary.current?.focus();
  }, []);
  return (
    <dialog ref={dialog} open aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50 m-0 flex min-h-full w-full max-w-none items-center justify-center border-0 bg-black/40 p-3 backdrop:bg-black/40 sm:p-6">
      <section className="w-full max-w-md space-y-4 rounded-xl border border-line bg-raised p-5 text-ink shadow-raised">
        <h2 id={titleId} ref={heading} tabIndex={-1} className="text-base font-semibold">{message}</h2>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={cancel}>{REVIEW_CANCEL_LABEL}</Button>
          <Button ref={primary} type="button" variant={destructive ? "destructive" : "default"} disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
    </dialog>
  );
}
