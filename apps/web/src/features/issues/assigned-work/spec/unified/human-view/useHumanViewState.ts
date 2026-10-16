"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { SourceFocus } from "../useSourceFocus";
import type { ViewMode } from "./humanViewCopy";
import { useWorkNavigation, type ViewTarget } from "./humanViewNav";
import type { SourceRef } from "./overviewTypes";
import type { ItemFocus } from "./useItemFocus";

export type ViewState = { mode: ViewMode; sections: Partial<Record<ViewMode, string>>; docTab: string | null; focus: SourceFocus | null; itemFocus: ItemFocus | null; nonce: number };

function applyTarget(state: ViewState, target: ViewTarget): ViewState {
  const nonce = state.nonce + 1;
  const sections = target.section ? { ...state.sections, [target.mode]: target.section } : state.sections;
  return { ...state, mode: target.mode, sections, focus: null, itemFocus: target.itemId ? { itemId: target.itemId, nonce } : null, nonce };
}

function applySource(state: ViewState, source: SourceRef): ViewState {
  const nonce = state.nonce + 1;
  return { ...state, mode: "original", docTab: source.tabId, itemFocus: null, focus: { documentId: source.documentId, sectionId: source.sectionId, nonce }, nonce };
}

function initialState(hasOverview: boolean, pending: ViewTarget | null): ViewState {
  const base: ViewState = { mode: hasOverview ? "overview" : "original", sections: {}, docTab: null, focus: null, itemFocus: null, nonce: 0 };
  return pending ? applyTarget(base, pending) : base;
}

function viewActions(setState: Dispatch<SetStateAction<ViewState>>) {
  return {
    pickMode: (mode: ViewMode) => setState((current) => ({ ...current, mode, focus: null, itemFocus: null })),
    pickSection: (mode: ViewMode, section: string) => setState((current) => ({ ...current, sections: { ...current.sections, [mode]: section }, itemFocus: null })),
    pickDocTab: (tabId: string) => setState((current) => ({ ...current, mode: "original", docTab: tabId, focus: null })),
    openSource: (source: SourceRef) => setState((current) => applySource(current, source)),
    openItem: (target: ViewTarget) => setState((current) => applyTarget(current, target)),
  };
}

export function useHumanViewState(hasOverview: boolean, acceptsRequests: boolean) {
  const navigation = useWorkNavigation();
  const request = acceptsRequests ? navigation?.request ?? null : null;
  const pending = request && request.nonce > (navigation?.appliedNonce ?? 0) ? request : null;
  const [state, setState] = useState<ViewState>(() => initialState(hasOverview, pending));
  const [seenNonce, setSeenNonce] = useState(request?.nonce ?? 0);
  if (request && request.nonce !== seenNonce) {
    setSeenNonce(request.nonce);
    setState((current) => applyTarget(current, request));
  }
  useEffect(() => { if (request) navigation?.markApplied(request.nonce); }, [request, navigation]);
  return { state, ...viewActions(setState) };
}
