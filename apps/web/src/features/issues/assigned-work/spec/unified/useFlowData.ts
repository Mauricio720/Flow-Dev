"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { FlowOptions, FlowOverview, FlowRuns, FlowTarget } from "./unifiedContract";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATES = ["succeeded", "failed", "canceled", "blocked", "stalled", "exhausted"];

type Snapshot = { overview: FlowOverview; runs: FlowRuns; options: FlowOptions | null };
type Input = { target: FlowTarget; initial: FlowOverview | null; canAct: boolean };

async function read(target: FlowTarget, canAct: boolean): Promise<Snapshot> {
  const [overview, runs, options] = await Promise.all([
    trpc.taskFlow.byTask.query(target),
    trpc.taskFlow.runs.query(target),
    canAct ? trpc.taskFlow.options.query(target) : Promise.resolve(null),
  ]);
  return { overview, runs, options };
}

export function useFlowData({ target, initial, canAct }: Input) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(() => read(target, canAct).then(
    (next) => { if (alive.current) { setSnapshot((current) => current ? { ...next, runs: { items: mergeRuns(next.runs.items, current.runs.items), nextCursor: current.runs.nextCursor } } : next); setFailed(false); } },
    () => { if (alive.current) setFailed(true); },
  ), [target, canAct]);

  const loadMore = useCallback(async () => {
    const cursor = snapshot?.runs.nextCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await trpc.taskFlow.runs.query({ ...target, cursor });
      if (alive.current) setSnapshot((current) => current ? { ...current, runs: { items: mergeRuns(current.runs.items, page.items), nextCursor: page.nextCursor } } : current);
    } catch {
      if (alive.current) setFailed(true);
    } finally {
      if (alive.current) setLoadingMore(false);
    }
  }, [snapshot?.runs.nextCursor, loadingMore, target]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  const overview = snapshot?.overview ?? initial;
  const active = snapshot?.runs.items.some((run) => !TERMINAL_STATES.includes(run.state)) ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  return { overview, runs: snapshot?.runs ?? null, options: snapshot?.options ?? null, failed, refresh, loadMore, loadingMore };
}

function mergeRuns<T extends { id: string }>(current: T[], incoming: T[]) {
  const seen = new Set(current.map((run) => run.id));
  return [...current, ...incoming.filter((run) => !seen.has(run.id))];
}
