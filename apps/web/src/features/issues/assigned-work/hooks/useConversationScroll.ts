"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const NEAR_END_PX = 48;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type ScrollEdges = { atStart: boolean; atEnd: boolean };

function distanceToEnd(region: HTMLElement) {
  return region.scrollHeight - region.scrollTop - region.clientHeight;
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function scrollRegionToEnd(region: HTMLElement | null, smooth: boolean) {
  if (!region) return;
  const behavior = smooth && !prefersReducedMotion() ? "smooth" : "auto";
  if (typeof region.scrollTo === "function") region.scrollTo({ top: region.scrollHeight, behavior });
  else region.scrollTop = region.scrollHeight;
}

export function useConversationScroll(entryCount: number) {
  const regionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLOListElement>(null);
  const following = useRef(true);
  const seenCount = useRef(entryCount);
  const [edges, setEdges] = useState<ScrollEdges>({ atStart: true, atEnd: true });
  const [hasUnseen, setHasUnseen] = useState(false);
  const measure = useCallback(() => {
    const region = regionRef.current;
    if (!region) return;
    const atEnd = distanceToEnd(region) <= NEAR_END_PX;
    following.current = atEnd;
    if (atEnd) setHasUnseen(false);
    setEdges({ atStart: region.scrollTop <= 0, atEnd });
  }, []);
  useLayoutEffect(() => {
    const arrived = entryCount > seenCount.current;
    seenCount.current = entryCount;
    if (following.current) scrollRegionToEnd(regionRef.current, false);
    else if (arrived) setHasUnseen(true);
    measure();
  }, [entryCount, measure]);
  useEffect(() => followContentGrowth({ content: contentRef.current, region: regionRef.current, following, measure }), [measure]);
  const jumpToEnd = useCallback(() => scrollRegionToEnd(regionRef.current, true), []);
  return { regionRef, contentRef, edges, hasUnseen, onScroll: measure, jumpToEnd };
}

type GrowthInput = { content: HTMLElement | null; region: HTMLElement | null; following: { current: boolean }; measure: () => void };

function followContentGrowth({ content, region, following, measure }: GrowthInput) {
  if (!content || typeof ResizeObserver === "undefined") return undefined;
  const observer = new ResizeObserver(() => {
    if (following.current) scrollRegionToEnd(region, false);
    measure();
  });
  observer.observe(content);
  return () => observer.disconnect();
}
