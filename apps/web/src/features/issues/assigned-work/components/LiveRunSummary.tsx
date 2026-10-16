"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_LABEL, FIRST_UPDATE, LIVE_RUN_TITLE } from "../progressCopy";
import { elapsedLabel, runClock } from "../spec/unified/runTime";
import { ACTION_LABELS, RUN_STATE_LABELS } from "../spec/unified/unifiedCopy";
import type { LiveRun } from "../workProgress";

const TICK_MS = 1000;
const LOOP_KIND = "loop";
const MACHINE_PAYLOAD_PREFIXES = ["{", "["];

function runName(run: LiveRun) {
  return run.kind === LOOP_KIND ? `Loop ${run.loopName}` : ACTION_LABELS[run.kind] ?? run.kind;
}

function readablePreview(preview: string) {
  const trimmed = preview.trim();
  return MACHINE_PAYLOAD_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ? null : trimmed;
}

function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, TICK_MS);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  return now;
}

function ActivityLine({ activity }: { activity: LiveRun["activity"] }) {
  if (!activity) return <p className="text-sm text-ink-2">{FIRST_UPDATE}</p>;
  const detail = readablePreview(activity.preview);
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-ink-2">
        <span className="font-medium text-ink">{ACTIVITY_LABEL[activity.kind] ?? "Atualização da execução"}</span>
        {activity.tool && <span className="font-mono">{activity.tool}</span>}
        {activity.source && <span className="font-mono text-ink-3 [overflow-wrap:anywhere]">{activity.source}</span>}
        <time dateTime={activity.at} className="ml-auto font-mono tabular-nums text-ink-3">{runClock(activity.at)}</time>
      </p>
      {detail && <p className="line-clamp-2 text-sm leading-6 text-ink-2 [overflow-wrap:anywhere]">{detail}</p>}
    </>
  );
}

export function LiveRunSummary({ run }: { run: LiveRun }) {
  const now = useNow();
  return (
    <section aria-label={LIVE_RUN_TITLE} className="space-y-1.5 rounded-lg border border-project/30 bg-project-wash/50 px-3 py-2.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-project-ink">
        <span aria-hidden="true" className="node-running size-2 rounded-full bg-project" />
        <span className="font-semibold">{runName(run)}</span>
        <span>{RUN_STATE_LABELS[run.state] ?? run.state}</span>
        <span className="text-ink-3">há <span className="tabular-nums">{elapsedLabel({ createdAt: run.createdAt, finishedAt: null }, now)}</span></span>
      </p>
      <ActivityLine activity={run.activity} />
    </section>
  );
}
