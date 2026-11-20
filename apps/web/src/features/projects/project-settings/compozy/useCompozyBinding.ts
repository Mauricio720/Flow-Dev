"use client";

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { trpcData } from "@/lib/trpc/error";
import type { CompozyBinding, CompozyHealth } from "./compozyContract";

export type CompozyView = { binding: CompozyBinding | null; compozy: CompozyHealth };
export type CompozyLoad = { kind: "loading" } | { kind: "loaded"; view: CompozyView } | { kind: "failed"; reason: unknown };

const LOADING: CompozyLoad = { kind: "loading" };

export function failureReason(error: unknown) {
  const data = trpcData(error);
  return data && "reason" in data ? data.reason : undefined;
}

async function readView(projectId: string): Promise<CompozyLoad> {
  try {
    const { binding, compozy } = await trpc.projectCompozy.get.query({ projectId });
    return { kind: "loaded", view: { binding, compozy } };
  } catch (error) {
    return { kind: "failed", reason: failureReason(error) };
  }
}

export function useCompozyBinding(projectId: string) {
  const [load, setLoad] = useState<CompozyLoad>(LOADING);
  const reload = useCallback(async () => {
    const next = await readView(projectId);
    setLoad(next);
    return next;
  }, [projectId]);
  useEffect(() => {
    let current = true;
    void readView(projectId).then((next) => current && setLoad(next));
    return () => {
      current = false;
    };
  }, [projectId]);
  function update(change: Partial<CompozyView>) {
    setLoad((previous) => (previous.kind === "loaded" ? { kind: "loaded", view: { ...previous.view, ...change } } : previous));
  }
  function refreshHealth() {
    void readView(projectId).then((next) => next.kind === "loaded" && update({ compozy: next.view.compozy }));
  }
  return { load, reload, update, refreshHealth };
}
