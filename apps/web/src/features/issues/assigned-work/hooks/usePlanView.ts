"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPlan } from "../planClient";
import type { PlanView } from "../planContract";
import { PLAN_LOAD_FAILED } from "../planCopy";
import type { TerminalScope } from "../terminalContract";
import { TASK_SET_POLL_MS } from "./useTaskSet";

export function usePlanView(scope: TerminalScope, enabled: boolean) {
  const { projectId, taskId } = scope;
  const [view, setView] = useState<PlanView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const read = useCallback(async () => {
    try {
      setView(await fetchPlan({ projectId, taskId }));
      setFailure(null);
    } catch {
      setFailure(PLAN_LOAD_FAILED);
    }
  }, [projectId, taskId]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cycle = async () => {
      await read();
      if (active) timer = setTimeout(() => void cycle(), TASK_SET_POLL_MS);
    };
    void cycle();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, read]);
  return { view, failure, read };
}
