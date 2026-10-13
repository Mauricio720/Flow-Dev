import { useEffect, useEffectEvent, type Dispatch, type SetStateAction } from "react";
import { trpc } from "@/lib/trpc/client";
import type { FlowTarget } from "./unifiedContract";

export type Preparation = { id: string; state: string; reason?: string | null; detail?: string | null; safeLabel?: string; dirty?: boolean | null; capabilities?: string[]; requiredGates?: { id: string; label: string; kind: "command" | "playwright" }[] };

export const SETTLED_PREPARATION_STATES = ["failed", "blocked", "canceled", "expired", "unknown", "succeeded"];
const PENDING_POLL_MS = 2000;
const READY_POLL_MS = 15_000;

export function usePreparationPolling(target: FlowTarget, preparations: Record<string, Preparation>, setPreparations: Dispatch<SetStateAction<Record<string, Preparation>>>, onUpdated: (actionId: string, preparation: Preparation) => void) {
  const reportUpdate = useEffectEvent(onUpdated);
  useEffect(() => {
    const watched = Object.entries(preparations).filter(([, value]) => !SETTLED_PREPARATION_STATES.includes(value.state));
    if (watched.length === 0) return;
    let active = true;
    const delay = watched.some(([, value]) => value.state !== "ready") ? PENDING_POLL_MS : READY_POLL_MS;
    const timer = window.setTimeout(() => {
      for (const [actionId, preparation] of watched) {
        void trpc.taskFlow.localPreparationStatus.query({ ...target, preparationId: preparation.id }).then((result) => {
          if (!active || !result) return;
          const updated = { ...result, id: preparation.id };
          setPreparations((current) => ({ ...current, [actionId]: updated }));
          reportUpdate(actionId, updated);
        }).catch(() => { if (active) setPreparations((current) => ({ ...current })); });
      }
    }, delay);
    return () => { active = false; window.clearTimeout(timer); };
  }, [preparations, setPreparations, target]);
}
