"use client";

import { useState } from "react";
import type { AgentChoice } from "../terminalContract";
import type { ReviewStartInput, ReviewStartOutcome } from "./useReviewActions";

type Choices = { reviewer: AgentChoice; executor: AgentChoice };
type Pending = { kind: "partial" } | { kind: "sessions"; count: number; partial: boolean };

export function useReviewStartFlow(onStart: (input: ReviewStartInput) => Promise<ReviewStartOutcome>, choices: Choices) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const submit = async (partial: boolean, allowOpenSessions: boolean) => {
    setBusy(true);
    setFailure(null);
    setPending(null);
    const outcome = await onStart({ ...choices, partial, allowOpenSessions });
    setBusy(false);
    if (outcome.kind === "sessions_open") setPending({ kind: "sessions", count: outcome.count, partial });
    if (outcome.kind === "failed") setFailure(outcome.message);
  };
  const confirm = () => {
    if (pending?.kind === "partial") return submit(true, false);
    return pending ? submit(pending.partial, true) : Promise.resolve();
  };
  return { pending, busy, failure, start: () => submit(false, false), askPartial: () => setPending({ kind: "partial" }), confirm, cancel: () => setPending(null) };
}
