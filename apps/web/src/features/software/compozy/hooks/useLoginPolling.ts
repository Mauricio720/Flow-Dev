"use client";

import { useEffect, type Dispatch } from "react";
import { trpc } from "@/lib/trpc/client";
import type { LoginAction, LoginUi } from "./loginState";

const POLL_INTERVAL_MS = 3000;
const POLL_FAILURE_MESSAGE = "Não foi possível consultar a autorização. Tente iniciar novamente.";

export function useLoginPolling(state: LoginUi, dispatch: Dispatch<LoginAction>) {
  const waitingStart = state.phase === "waiting" ? state.start : null;
  useEffect(() => {
    if (!waitingStart) return;
    const timer = window.setInterval(async () => {
      try {
        const poll = await trpc.software.compozy.pollLogin.mutate({ operationId: waitingStart.operationId });
        dispatch({ type: "polled", start: waitingStart, poll });
      } catch {
        dispatch({ type: "failed", message: POLL_FAILURE_MESSAGE });
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [waitingStart, dispatch]);
}
