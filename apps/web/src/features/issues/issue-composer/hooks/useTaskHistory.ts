"use client";

import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MAX_SEARCH_CODE_POINTS, codePoints, type HistoryLoad, type TaskSummary } from "../contract";
import { historyPollInterval, historyReducer, initialHistoryState, type HistoryRequest } from "../historyState";
import { taskFailure } from "../taskFailure";
import { usePolling } from "./usePolling";

const SEARCH_DELAY_MS = 250;

function useHistorySearch(appliedSearch: string, load: (request: HistoryRequest) => Promise<void>) {
  const [term, setTerm] = useState("");
  const wanted = term.trim();
  const searchTooLong = codePoints(wanted) > MAX_SEARCH_CODE_POINTS;
  const search = useEffectEvent((value: string) => void load({ search: value }));
  useEffect(() => {
    if (searchTooLong || wanted === appliedSearch) return;
    const timer = window.setTimeout(() => search(wanted), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [wanted, searchTooLong, appliedSearch]);
  return { term, setTerm, searchTooLong };
}

export function useTaskHistory(projectId: string, initial: HistoryLoad) {
  const [state, dispatch] = useReducer(historyReducer, initial, initialHistoryState);
  const latest = useRef(0);
  async function load(request: HistoryRequest) {
    const attempt = ++latest.current;
    if (!request.background) dispatch({ type: "requested", request });
    try {
      const page = await trpc.tasks.list.query({ projectId, search: request.search || undefined, cursor: request.cursor });
      if (attempt === latest.current) dispatch({ type: "loaded", request, page });
    } catch (error) {
      if (attempt === latest.current && !request.background) dispatch({ type: "failed", failure: taskFailure(error) });
    }
  }
  usePolling(() => void load({ search: state.appliedSearch, refresh: true, background: true }), historyPollInterval(state));
  return {
    ...state,
    ...useHistorySearch(state.appliedSearch, load),
    loadMore: () => load({ search: state.appliedSearch, cursor: state.nextCursor ?? undefined }),
    retry: () => load(state.pending ?? { search: state.appliedSearch }),
    refresh: () => load({ search: state.appliedSearch, refresh: true }),
    observe: (task: TaskSummary) => dispatch({ type: "observed", task }),
  };
}

export type TaskHistory = ReturnType<typeof useTaskHistory>;
