"use client";

import { type Dispatch, useEffect, useReducer, useRef } from "react";
import { taskFailure } from "@/lib/tasks/taskFailure";
import { trpc } from "@/lib/trpc/client";
import { activeReducer, initialActiveState, type ActiveAction } from "../activeState";
import type { ActiveFilter, ActiveLoad } from "../contract";

const POLL_INTERVAL_MS = 5000;

type PollInput = { projectId: string; filter: ActiveFilter; running: boolean; dispatch: Dispatch<ActiveAction> };

function usePollWhileRunning({ projectId, filter, running, dispatch }: PollInput) {
  useEffect(() => {
    if (!running) return;
    const poll = () => trpc.assignedIssues.active.query({ projectId, filter }).then((page) => dispatch({ type: "polled", filter, page }), () => undefined);
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [projectId, filter, running, dispatch]);
}

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
  const running = state.items.some((item) => item.progress.activeRun !== null);
  usePollWhileRunning({ projectId, filter: state.filter, running, dispatch });
  return { ...state, select: (filter: ActiveFilter) => load(filter), refresh: () => load(state.filter), loadMore: () => load(state.filter, state.nextCursor ?? undefined) };
}

export type ActiveWorkList = ReturnType<typeof useActiveWork>;
