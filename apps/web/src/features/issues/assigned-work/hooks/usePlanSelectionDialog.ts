"use client";

import { useRef, useState } from "react";
import type { SelectionTarget } from "../planContract";

export function usePlanSelectionDialog() {
  const [target, setTarget] = useState<SelectionTarget | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const open = (next: SelectionTarget, button: HTMLButtonElement) => {
    trigger.current = button;
    setTarget(next);
  };
  const close = () => setTarget(null);
  return { target, trigger, open, close };
}

export type PlanSelectionDialogState = ReturnType<typeof usePlanSelectionDialog>;
