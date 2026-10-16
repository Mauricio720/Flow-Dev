"use client";

import { useEffect, useRef, type RefObject } from "react";

type FocusRefs = { trigger: RefObject<HTMLButtonElement | null>; dialog: RefObject<HTMLDialogElement | null>; heading: RefObject<HTMLHeadingElement | null> };

export function useDialogFocus(open: boolean, busy: boolean, onClose: () => void, refs: FocusRefs) {
  const closeDialog = useRef(onClose);
  useEffect(() => {
    closeDialog.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    refs.heading.current?.focus();
    const dialog = refs.dialog.current;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) closeDialog.current();
      }
      if (event.key === "Tab" && dialog) keepFocusInside(event, dialog);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, refs.trigger, refs.dialog, refs.heading]);
}

function keepFocusInside(event: KeyboardEvent, dialog: HTMLDialogElement) {
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
