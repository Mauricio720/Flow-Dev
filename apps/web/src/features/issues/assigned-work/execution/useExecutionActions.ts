"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { executionErrorMessage } from "./executionCopy";
import type { ExecutionActions, ExecutionPending, ExecutionTarget } from "./executionTypes";

const START_KEY_PREFIX = "flow-dev:task-execution-start:";

function storageKey(taskId: string) {
  return `${START_KEY_PREFIX}${taskId}`;
}

function startKey(taskId: string, reuse: boolean) {
  const key = storageKey(taskId);
  const existing = reuse ? window.sessionStorage.getItem(key) : null;
  if (existing) return existing;
  const generated = globalThis.crypto.randomUUID();
  window.sessionStorage.setItem(key, generated);
  return generated;
}

export function useExecutionActions(target: ExecutionTarget, refresh: () => Promise<void>): ExecutionActions {
  const start = useStartAction(target, refresh);
  const cancel = useCancelAction(target, refresh);
  return { pending: start.pending ?? cancel.pending, actionError: start.error ?? cancel.error, start: start.run, cancel: cancel.run };
}

function useStartAction(target: ExecutionTarget, refresh: () => Promise<void>) {
  const { projectId, taskId } = target;
  const [pending, setPending] = useState<ExecutionPending>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (decisionId: string, decisionVersion: number, reuseKey: boolean) => {
    setPending("start");
    setError(null);
    try {
      const receipt = await trpc.taskExecution.start.mutate({ projectId, taskId, decisionId, expectedDecisionVersion: decisionVersion, idempotencyKey: startKey(taskId, reuseKey) });
      if (receipt.state !== "unavailable") window.sessionStorage.removeItem(storageKey(taskId));
    } catch (failure) {
      setError(executionErrorMessage(failure, "start"));
    }
    await refresh();
    setPending(null);
  }, [refresh, projectId, taskId]);
  return { pending: pending === "start" ? pending : null, error, run };
}

function useCancelAction(target: ExecutionTarget, refresh: () => Promise<void>) {
  const { projectId, taskId } = target;
  const [pending, setPending] = useState<ExecutionPending>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (executionId: string) => {
    setPending("cancel");
    setError(null);
    try {
      await trpc.taskExecution.cancel.mutate({ projectId, taskId, executionId, idempotencyKey: globalThis.crypto.randomUUID() });
    } catch (failure) {
      setError(executionErrorMessage(failure, "cancel"));
    }
    await refresh();
    setPending(null);
  }, [refresh, projectId, taskId]);
  return { pending: pending === "cancel" ? pending : null, error, run };
}
