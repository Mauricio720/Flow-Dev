"use client";

import { useReducer, useRef } from "react";
import { taskFailure } from "@/lib/tasks/taskFailure";
import { trpc } from "@/lib/trpc/client";
import { activeReducer, initialActiveState } from "../activeState";
import type { ActiveFilter, ActiveLoad } from "../contract";

export function useActiveWork(projectId: string, initial: ActiveLoad) {
  const [state, dispatch] = useReducer(activeReducer, initial, initialActiveState);
  const latest = useRef(0);
  async function load(filter: ActiveFilter, cursor?: string) {
    const attempt = ++latest.current;
    dispatch({ type: "requested", filter });
    try {
      const page = await trpc.assignedIssues.active.query({ projectId, filter, cursor });
      if (attempt === latest.current) dispatch({ type: "loaded", filter, page, replace: cursor === undefined });
    } catch (error) {
      if (attempt === latest.current) dispatch({ type: "failed", failure: taskFailure(error) });
    }
  }
  return { ...state, select: (filter: ActiveFilter) => load(filter), refresh: () => load(state.filter), loadMore: () => load(state.filter, state.nextCursor ?? undefined) };
}

export type ActiveWorkList = ReturnType<typeof useActiveWork>;
