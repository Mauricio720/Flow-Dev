"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { SoftwareInitial } from "../contract";
import { useAccessGuard } from "./useAccessGuard";
import { usePagedList } from "./usePagedList";
import { useReadiness } from "./useReadiness";

export function useSoftwarePage(initial: SoftwareInitial) {
  const guard = useAccessGuard();
  const [settings, setSettings] = useState(initial.settings);
  const readiness = useReadiness();
  const connections = usePagedList(initial.connections, useCallback((cursor?: string) => trpc.software.compozy.connections.query({ cursor }), []));
  const history = usePagedList(initial.history, useCallback((cursor?: string) => trpc.software.compozy.history.query({ cursor }), []));

  const reloadSettings = useCallback(async () => {
    try { setSettings(await trpc.software.compozy.get.query()); } catch (error) { guard(error); }
  }, [guard]);

  const refreshAll = useCallback(async () => {
    await Promise.all([readiness.refresh(), connections.reload(), history.reload(), reloadSettings()]);
  }, [connections, history, readiness, reloadSettings]);

  return { settings, setSettings, readiness, connections, history, reloadSettings, refreshAll };
}
