"use client";

import { useReducer, useRef } from "react";
import { taskFailure } from "@/lib/tasks/taskFailure";
import { trpc } from "@/lib/trpc/client";
import type { QueueLoad } from "../contract";
import { initialQueueState, queueReducer } from "../queueState";

export function useWorkQueue(projectId: string, initial: QueueLoad) {
  const [state, dispatch] = useReducer(queueReducer, initial, initialQueueState);
  const latest = useRef(0);
  async function load(cursor: string | undefined) {
    const attempt = ++latest.current;
    dispatch({ type: "requested" });
    try {
      const page = await trpc.assignedIssues.list.query({ projectId, cursor });
      if (attempt === latest.current) dispatch({ type: "loaded", page, replace: cursor === undefined });
    } catch (error) {
      if (attempt === latest.current) dispatch({ type: "failed", failure: taskFailure(error) });
    }
  }
  return { ...state, refresh: () => load(undefined), loadMore: () => load(state.nextCursor ?? undefined) };
}

export type WorkQueue = ReturnType<typeof useWorkQueue>;
