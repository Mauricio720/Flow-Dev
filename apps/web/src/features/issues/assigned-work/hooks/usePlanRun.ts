"use client";

import { useRef, useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import type { PlanView } from "../planContract";
import { pausePlanRun, resumePlanRun, startPlanRun } from "../planRunClient";
import { RUN_FAILED } from "../planRunCopy";
import type { TerminalScope } from "../terminalContract";

type Input = { scope: TerminalScope; view: PlanView; onChanged: () => Promise<void> | void };

function runMessage(error: unknown) {
  const data = trpcData(error);
  return error instanceof Error && data && "reason" in data ? error.message : RUN_FAILED;
}

export function usePlanRun({ scope, view, onChanged }: Input) {
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const perform = async (operation: () => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await operation();
    } catch (error) {
      setFailure(runMessage(error));
    } finally {
      inFlight.current = false;
      setBusy(false);
      await onChanged();
    }
  };
  const revision = view.run?.revision ?? 0;
  return {
    busy,
    failure,
    start: () => perform(() => startPlanRun(scope, crypto.randomUUID())),
    pause: () => perform(() => pausePlanRun(scope, revision)),
    resume: () => perform(() => resumePlanRun(scope, revision)),
  };
}

export type PlanRunControls = ReturnType<typeof usePlanRun>;
