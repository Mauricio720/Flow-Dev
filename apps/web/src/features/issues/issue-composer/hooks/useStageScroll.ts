"use client";

import { useEffect, useRef } from "react";

const DRAFT_ANCHOR = "[data-anchor=draft]";
const ANCHOR_OFFSET = 24;

function openAtDraft(element: HTMLDivElement) {
  const anchor = [...element.querySelectorAll<HTMLElement>(DRAFT_ANCHOR)].at(-1);
  const top = anchor ? anchor.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop - ANCHOR_OFFSET : element.scrollHeight;
  element.scrollTo?.({ top });
}

function isReviewingDraft(element: HTMLDivElement) {
  return Boolean(document.activeElement?.closest(DRAFT_ANCHOR)) && element.contains(document.activeElement);
}

export function useStageScroll(growth: string) {
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const previous = seen.current;
    seen.current = growth;
    if (previous === null) return openAtDraft(element);
    if (previous !== growth && !isReviewingDraft(element)) element.scrollTo?.({ top: element.scrollHeight, behavior: "smooth" });
  }, [growth]);
  return scroller;
}
