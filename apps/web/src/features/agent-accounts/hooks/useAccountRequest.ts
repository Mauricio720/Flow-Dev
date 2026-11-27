"use client";

import { useState } from "react";
import type { AccountFailure } from "../agentAccountsClient";
import { useSessionExpiry } from "./useSessionExpiry";

const FAILURE_KINDS = new Set(["unauthorized", "failed"]);

function isFailure(outcome: { kind: string }): outcome is AccountFailure {
  return FAILURE_KINDS.has(outcome.kind);
}

export function useAccountRequest() {
  const leave = useSessionExpiry();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function run<T extends { kind: string }>(request: () => Promise<T | AccountFailure>, onDone: (outcome: T) => void) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const outcome = await request();
    setBusy(false);
    if (!isFailure(outcome)) return onDone(outcome);
    if (outcome.kind === "unauthorized") return leave();
    setMessage(outcome.message);
  }
  const clear = () => setMessage(null);
  return { busy, message, run, clear };
}
