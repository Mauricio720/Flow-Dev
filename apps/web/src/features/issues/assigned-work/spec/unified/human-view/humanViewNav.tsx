"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ViewMode } from "./humanViewCopy";
import type { SourceRef } from "./overviewTypes";

export type ViewTarget = { mode: ViewMode; section?: string; itemId?: string };
export type ViewRequest = ViewTarget & { nonce: number };
export type ViewLinks = { openItem: (target: ViewTarget) => void; openSource: (source: SourceRef) => void; artifactLabel: string };
type WorkNavigation = { request: ViewRequest | null; appliedNonce: number; open: (target: ViewTarget) => void; markApplied: (nonce: number) => void };

const ViewLinksContext = createContext<ViewLinks | null>(null);
const WorkNavigationContext = createContext<WorkNavigation | null>(null);
const DOM_UNSAFE = /[^a-zA-Z0-9_-]/g;

export function itemDomId(itemId: string) {
  return `hv-${itemId.replace(DOM_UNSAFE, "-")}`;
}

export function ViewLinksProvider({ value, children }: { value: ViewLinks; children: ReactNode }) {
  return <ViewLinksContext.Provider value={value}>{children}</ViewLinksContext.Provider>;
}

export function useViewLinks() {
  return useContext(ViewLinksContext);
}

export function WorkNavigationProvider({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  const [request, setRequest] = useState<ViewRequest | null>(null);
  const [appliedNonce, setAppliedNonce] = useState(0);
  const open = useCallback((target: ViewTarget) => {
    setRequest((current) => ({ ...target, nonce: (current?.nonce ?? 0) + 1 }));
    onOpen();
  }, [onOpen]);
  const markApplied = useCallback((nonce: number) => setAppliedNonce((current) => Math.max(current, nonce)), []);
  const value = useMemo(() => ({ request, appliedNonce, open, markApplied }), [request, appliedNonce, open, markApplied]);
  return <WorkNavigationContext.Provider value={value}>{children}</WorkNavigationContext.Provider>;
}

export function useWorkNavigation() {
  return useContext(WorkNavigationContext);
}
