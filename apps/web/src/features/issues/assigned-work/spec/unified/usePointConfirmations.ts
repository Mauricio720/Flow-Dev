"use client";

import { useState } from "react";

type Confirmations = { packageId: string; ids: ReadonlySet<string> };
const NONE: ReadonlySet<string> = new Set();

export function usePointConfirmations(packageId: string | null) {
  const [state, setState] = useState<Confirmations | null>(null);
  const confirmed = state && state.packageId === packageId ? state.ids : NONE;
  const toggle = (id: string) => {
    if (!packageId) return;
    const next = new Set(confirmed);
    if (!next.delete(id)) next.add(id);
    setState({ packageId, ids: next });
  };
  return { confirmed, toggle };
}
