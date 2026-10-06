"use client";

import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { INITIAL_CANDIDATES, candidateReducer, type CandidateRequest } from "../candidateState";

const SEARCH_DELAY_MS = 300;

export function useRepositoryCandidates() {
  const [state, dispatch] = useReducer(candidateReducer, INITIAL_CANDIDATES);
  const [term, setTerm] = useState("");
  const latest = useRef(0);
  async function load(request: CandidateRequest) {
    const attempt = ++latest.current;
    dispatch({ type: "requested", request });
    try {
      const page = await trpc.projects.repositoryCandidates.query({ search: request.search || undefined, cursor: request.cursor });
      if (attempt === latest.current) dispatch({ type: "loaded", request, page });
    } catch (error) {
      if (attempt === latest.current) dispatch({ type: "failed", code: trpcCode(error) });
    }
  }
  const loadFirstBatch = useEffectEvent((search: string) => void load({ search }));
  const wanted = term.trim();
  useEffect(() => {
    const timer = window.setTimeout(() => loadFirstBatch(wanted), wanted ? SEARCH_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [wanted]);
  return {
    ...state,
    term,
    setTerm,
    continueSearch: () => void load({ search: state.appliedSearch, cursor: state.nextCursor ?? undefined }),
    retry: () => void load(state.pending),
  };
}

export type RepositoryCandidates = ReturnType<typeof useRepositoryCandidates>;
