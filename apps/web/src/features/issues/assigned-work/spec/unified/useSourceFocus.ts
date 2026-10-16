"use client";

import { useEffect, useRef } from "react";

export type SourceFocus = { documentId: string; sectionId: string; nonce: number };

export function useSourceFocus<T extends HTMLElement>(nonce: number | null) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (nonce === null) return;
    ref.current?.scrollIntoView?.({ block: "start" });
    ref.current?.focus({ preventScroll: true });
  }, [nonce]);
  return ref;
}
