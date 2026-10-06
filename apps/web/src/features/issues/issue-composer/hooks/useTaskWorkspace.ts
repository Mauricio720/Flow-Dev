"use client";

import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import type { TaskFailure, WorkspaceLoad } from "../contract";
import { accessProblem, isUnconfirmed, taskFailure } from "../taskFailure";
import { initialWorkspaceState, pollInterval, scopeState, taskScope, workspaceReducer } from "../workspaceState";
import { readMoreMessages, readSnapshot } from "./taskReads";
import { usePolling } from "./usePolling";

type Input = { projectId: string; taskId: string | null; initial: WorkspaceLoad; paused: boolean };

const TRANSIENT_BACKOFF_MS = 30_000;
const MS_PER_SECOND = 1_000;

function holdFor(failure: TaskFailure) {
  if (failure.retryAfterSeconds) return failure.retryAfterSeconds * MS_PER_SECOND;
  return isUnconfirmed(failure) ? TRANSIENT_BACKOFF_MS : 0;
}

export function useTaskWorkspace(input: Input) {
  const scope = taskScope(input.projectId, input.taskId);
  const [state, dispatch] = useReducer(workspaceReducer, input, initialWorkspaceState);
  const visible = state.scope === scope ? state : scopeState(scope, input.taskId);
  const tracker = useRef({ scope: state.scope, attempt: 0, holdUntil: 0, inFlight: false });
  async function load(read: (target: { projectId: string; taskId: string }) => ReturnType<typeof readSnapshot>) {
    if (!input.taskId) return;
    const attempt = ++tracker.current.attempt;
    const isCurrent = () => tracker.current.scope === scope && tracker.current.attempt === attempt;
    tracker.current.inFlight = true;
    try {
      const snapshot = await read({ projectId: input.projectId, taskId: input.taskId });
      tracker.current.holdUntil = 0;
      if (isCurrent()) dispatch({ type: "loaded", scope, snapshot });
    } catch (error) {
      const failure = taskFailure(error);
      tracker.current.holdUntil = Date.now() + holdFor(failure);
      if (isCurrent()) dispatch({ type: "failed", scope, failure });
    } finally {
      if (isCurrent()) tracker.current.inFlight = false;
    }
  }
  const refresh = () => load((target) => readSnapshot(target, visible.snapshot));
  const loadMoreMessages = () => load((target) => (visible.snapshot ? readMoreMessages(target, visible.snapshot) : readSnapshot(target, null)));
  const openScope = useEffectEvent(() => void refresh());
  useEffect(() => {
    const changed = tracker.current.scope !== scope;
    tracker.current.scope = scope;
    if (changed) openScope();
  }, [scope]);
  const paused = input.paused || accessProblem(visible.failure) !== null;
  const poll = () => {
    if (tracker.current.inFlight || Date.now() < tracker.current.holdUntil) return;
    void refresh();
  };
  const detail = visible.snapshot?.detail ?? null;
  usePolling(poll, paused ? null : pollInterval(detail?.task.status ?? null, detail?.planning.status ?? null));
  return { ...visible, refresh, loadMoreMessages };
}

export type TaskWorkspace = ReturnType<typeof useTaskWorkspace>;
