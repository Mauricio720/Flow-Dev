"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { CatalogLoad } from "../catalogState";
import { useCatalogLoader } from "./useCatalogLoader";

const SEARCH_DELAY_MS = 250;

export function useCatalog(initial: CatalogLoad) {
  const { state, load } = useCatalogLoader(initial);
  const [term, setTerm] = useState("");
  const wanted = term.trim();
  const search = useEffectEvent((value: string) => void load({ search: value }));
  useEffect(() => {
    if (wanted === state.appliedSearch) return;
    const timer = window.setTimeout(() => search(wanted), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [wanted, state.appliedSearch]);
  return {
    ...state,
    term,
    setTerm,
    loadMore: () => void load({ search: state.appliedSearch, cursor: state.nextCursor ?? undefined }),
    retry: () => void load(state.pending ?? { search: state.appliedSearch }),
    reload: () => void load({ search: state.appliedSearch }),
  };
}

export type Catalog = ReturnType<typeof useCatalog>;
