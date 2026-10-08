"use client";

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { Readiness } from "../contract";
import { useAccessGuard } from "./useAccessGuard";

export type ReadinessState = { status: "checking" } | { status: "failed" } | { status: "loaded"; readiness: Readiness };

export function useReadiness() {
  const guard = useAccessGuard();
  const [state, setState] = useState<ReadinessState>({ status: "checking" });

  const load = useCallback(() => trpc.software.compozy.readiness.query().then(
    (readiness): ReadinessState => ({ status: "loaded", readiness }),
    (error): ReadinessState => { guard(error); return { status: "failed" }; },
  ), [guard]);

  const refresh = useCallback(async () => {
    setState({ status: "checking" });
    setState(await load());
  }, [load]);

  useEffect(() => {
    let active = true;
    void load().then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, [load]);

  return { state, refresh };
}
