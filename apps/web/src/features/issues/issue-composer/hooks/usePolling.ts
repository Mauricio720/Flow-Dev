"use client";

import { useEffect, useEffectEvent } from "react";

const VISIBLE_STATE = "visible";

export function usePolling(poll: () => void, intervalMs: number | null) {
  const recheck = useEffectEvent(() => {
    if (document.visibilityState === VISIBLE_STATE) poll();
  });
  useEffect(() => {
    if (intervalMs === null) return;
    const timer = window.setInterval(recheck, intervalMs);
    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [intervalMs]);
}
