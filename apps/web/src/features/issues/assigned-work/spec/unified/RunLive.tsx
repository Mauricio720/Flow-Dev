"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RunActivity } from "./RunActivity";
import { RUN_FEEDBACK } from "./runFeedback";
import { elapsedLabel, runLabel } from "./runTime";
import type { FlowRun } from "./unifiedContract";
import { ACTION_LABELS, RUN_STATE_LABELS } from "./unifiedCopy";

type Props = { run: FlowRun; busy: boolean; asking: boolean; onCancel: ((runId: string) => void) | null };
const TICK_MS = 1000;

export function RunLive({ run, busy, asking, onCancel }: Props) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
        <span aria-hidden="true" className="node-running size-2 rounded-full bg-ink" />
        <span className="font-medium text-ink">{runLabel(run, ACTION_LABELS)}</span>
        <span>{RUN_STATE_LABELS[run.state] ?? "Estado desconhecido"}</span>
        <span className="text-ink-3">há <span className="tabular-nums">{elapsedLabel(run, now)}</span></span>
      </p>
      <p className="text-sm text-ink-2">{RUN_FEEDBACK[run.state] ?? "O estado da execução não está disponível."}</p>
      <RunActivity activity={run.activity ?? null} active={!asking} />
      {onCancel && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onCancel(run.id)}>Cancelar execução</Button>}
    </div>
  );
}
