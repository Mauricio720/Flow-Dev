"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { executionErrorMessage } from "./executionCopy";
import type { ExecutionQuery, ExecutionTarget, TaskExecutionStatus } from "./executionTypes";

const POLL_INTERVAL_MS = 5_000;

export function useExecutionQuery(target: ExecutionTarget): ExecutionQuery {
  const { projectId, taskId } = target;
  const [status, setStatus] = useState<TaskExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setStatus(await trpc.taskExecution.status.query({ projectId, taskId }));
      setError(null);
    } catch (failure) {
      setError(executionErrorMessage(failure));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [projectId, taskId]);
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);
  return { status, loading, error, refresh };
}
