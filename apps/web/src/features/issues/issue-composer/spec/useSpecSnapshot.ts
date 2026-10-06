"use client";

import { useEffect, useEffectEvent, useReducer, useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { accessProblem } from "../taskFailure";
import type { SpecSnapshot } from "./specContract";
import { specPollInterval } from "./specPolling";
import type { SpecTarget } from "./specReads";
import { createSpecReader, type ReaderTracker } from "./specSnapshotReader";
import { emptySpecState, specReducer } from "./specSnapshotState";

type Input = SpecTarget & { initial: SpecSnapshot | null; enabled: boolean };

export function useSpecSnapshot(input: Input) {
  const scope = `${input.projectId}:${input.taskId}`;
  const [state, dispatch] = useReducer(specReducer, undefined, () => emptySpecState(scope, input.initial));
  const [tracker] = useState<ReaderTracker>(() => ({ inFlight: false, loadedEvents: false }));
  const reader = createSpecReader({ target: { projectId: input.projectId, taskId: input.taskId }, scope, dispatch, tracker: () => tracker, state });
  const open = useEffectEvent(() => void reader.refresh());
  useEffect(() => { if (input.enabled) open(); }, [input.enabled, scope]);
  const denied = accessProblem(state.failure) !== null;
  usePolling(() => void reader.refresh(), input.enabled && !denied ? specPollInterval(state.snapshot) : null);
  return { ...state, denied, refresh: reader.refresh, loadOlder: reader.loadOlder };
}

export type SpecSnapshotHook = ReturnType<typeof useSpecSnapshot>;
