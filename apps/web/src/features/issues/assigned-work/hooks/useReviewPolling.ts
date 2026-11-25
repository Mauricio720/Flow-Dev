"use client";

import { useEffect } from "react";

export const REVIEW_POLL_MS = 3_000;

export function useReviewPolling(polling: boolean, read: () => Promise<void>) {
  useEffect(() => {
    if (!polling) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cycle = async () => {
      await read();
      if (active) timer = setTimeout(() => void cycle(), REVIEW_POLL_MS);
    };
    void cycle();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [polling, read]);
}
