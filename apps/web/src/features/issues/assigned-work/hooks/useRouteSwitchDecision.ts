"use client";

import { useRef, useState } from "react";
import { decideRouteSwitch } from "../sessionClient";
import type { RouteSwitchDecision, SessionScope } from "../sessionContract";
import { failureMessage } from "./useSessionActions";

type DecisionFailure = { proposalId: string; message: string };

function useDecisionKeys() {
  const keys = useRef(new Map<string, string>());
  return (proposalId: string, decision: RouteSwitchDecision) => {
    const slot = `${proposalId}:${decision}`;
    const known = keys.current.get(slot);
    if (known) return known;
    const created = crypto.randomUUID();
    keys.current.set(slot, created);
    return created;
  };
}

export function useRouteSwitchDecision(scope: SessionScope, onSettled: () => void) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<DecisionFailure | null>(null);
  const keyFor = useDecisionKeys();
  async function decide(proposalId: string, decision: RouteSwitchDecision) {
    setPendingId(proposalId);
    setFailure(null);
    try {
      await decideRouteSwitch(scope, { proposalId, decision, requestKey: keyFor(proposalId, decision) });
    } catch (error) {
      setFailure({ proposalId, message: failureMessage(error) });
    } finally {
      setPendingId(null);
      onSettled();
    }
  }
  const errorFor = (proposalId: string) => (failure?.proposalId === proposalId ? failure.message : null);
  return { pendingId, errorFor, decide };
}

export type RouteSwitchDecisionState = ReturnType<typeof useRouteSwitchDecision>;
