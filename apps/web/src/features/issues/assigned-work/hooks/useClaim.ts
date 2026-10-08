"use client";

import { useRef, useState } from "react";
import { createRequestKeys } from "@/lib/tasks/requestKeys";
import { taskFailure } from "@/lib/tasks/taskFailure";
import { trpc } from "@/lib/trpc/client";
import type { ClaimResult, QueueItem, TaskFailure } from "../contract";

export type ClaimPhase = { phase: "idle" } | { phase: "claiming" } | { phase: "settled"; result: ClaimResult } | { phase: "rejected"; failure: TaskFailure };

const IDLE: ClaimPhase = { phase: "idle" };

export function useClaim(projectId: string, onClaimed: (taskId: string) => void) {
  const [phases, setPhases] = useState<Record<string, ClaimPhase>>({});
  const keys = useRef(new Map<string, ReturnType<typeof createRequestKeys>>());
  const set = (issueNodeId: string, phase: ClaimPhase) => setPhases((current) => ({ ...current, [issueNodeId]: phase }));
  async function claim(item: QueueItem) {
    const store = keys.current.get(item.issueNodeId) ?? createRequestKeys();
    keys.current.set(item.issueNodeId, store);
    set(item.issueNodeId, { phase: "claiming" });
    try {
      const requestKey = store.keyFor(item.boardItemId);
      const result = await trpc.assignedIssues.claim.mutate({ projectId, issueNodeId: item.issueNodeId, boardItemId: item.boardItemId, requestKey });
      if (result.state === "claimed") onClaimed(result.taskId);
      set(item.issueNodeId, { phase: "settled", result });
    } catch (error) {
      set(item.issueNodeId, { phase: "rejected", failure: taskFailure(error) });
    }
  }
  return { phaseOf: (issueNodeId: string) => phases[issueNodeId] ?? IDLE, claim };
}

export type Claims = ReturnType<typeof useClaim>;
