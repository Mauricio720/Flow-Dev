"use client";

import { useReducer, useRef } from "react";
import { usePolling } from "@/hooks/usePolling";
import { taskFailure } from "@/lib/tasks/taskFailure";
import { trpc } from "@/lib/trpc/client";
import type { TaskFailure, WorkLoad, WorkSnapshot } from "../contract";
import { initialWorkState, lostAccess, workPollInterval, workReducer } from "../workState";

type Target = { projectId: string; taskId: string };

async function readWork(target: Target): Promise<WorkSnapshot> {
  const [view, detail] = await Promise.all([trpc.assignedIssues.byTask.query(target), trpc.tasks.byId.query(target)]);
  return { view, detail };
}

export function useWorkDetail(target: Target, initial: WorkLoad) {
  const [state, dispatch] = useReducer(workReducer, initial, initialWorkState);
  const inFlight = useRef(false);
  async function refresh() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      dispatch({ type: "loaded", snapshot: await readWork(target) });
    } catch (error) {
      dispatch({ type: "failed", failure: taskFailure(error) });
    } finally {
      inFlight.current = false;
    }
  }
  usePolling(() => void refresh(), workPollInterval(state));
  const report = (failure: TaskFailure) => lostAccess(failure) && dispatch({ type: "failed", failure });
  return { ...state, refresh, report };
}

export type WorkDetailState = ReturnType<typeof useWorkDetail>;
