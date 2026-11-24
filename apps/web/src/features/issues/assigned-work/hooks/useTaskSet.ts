"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTaskSet } from "../taskSetClient";
import type { TaskSetView } from "../taskSetContract";
import { TASK_SET_LOAD_FAILED } from "../taskSetCopy";
import type { TerminalScope } from "../terminalContract";

export const TASK_SET_POLL_MS = 5_000;

type Options = { enabled: boolean; poll: boolean };

export function useTaskSet(scope: TerminalScope, options: Options) {
  const { projectId, taskId } = scope;
  const [data, setData] = useState<TaskSetView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const read = useCallback(async () => {
    try {
      setData(await fetchTaskSet({ projectId, taskId }));
      setFailure(null);
    } catch {
      setFailure(TASK_SET_LOAD_FAILED);
    }
  }, [projectId, taskId]);
  useEffect(() => {
    if (!options.enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cycle = async () => {
      await read();
      if (active && options.poll) timer = setTimeout(() => void cycle(), TASK_SET_POLL_MS);
    };
    void cycle();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [options.enabled, options.poll, read]);
  return { data, failure, refresh: read };
}

export type TaskSetState = ReturnType<typeof useTaskSet>;
