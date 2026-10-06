"use client";

import { useEffect, useEffectEvent, useReducer } from "react";
import { createSpecCommandActions, type SpecCommandInput } from "./specCommandActions";
import { IDLE_SPEC_COMMAND, specCommandReducer } from "./specCommandState";
import { loadSpecPending } from "./specPendingStore";

const AWAIT_POLL_MS = 1_000;

export function useSpecCommand(input: SpecCommandInput) {
  const [command, dispatch] = useReducer(specCommandReducer, IDLE_SPEC_COMMAND);
  const actions = createSpecCommandActions({ input, dispatch, latest: () => command });
  const restore = useEffectEvent(() => {
    const pending = loadSpecPending(actions.scope);
    if (!pending) return;
    dispatch({ type: "begin", pending });
    dispatch({ type: "unconfirmed" });
    void actions.observe(pending).catch(actions.fail);
  });
  useEffect(() => { restore(); }, [input.viewerId, input.projectId, input.taskId]);
  const recheck = useEffectEvent(() => void actions.reconcile());
  const awaiting = command.phase === "awaiting";
  useEffect(() => {
    if (!awaiting) return;
    const timer = window.setInterval(recheck, AWAIT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [awaiting]);
  const resend = () => { const pending = command.pending; if (pending) void actions.run(pending.request); };
  return { command, run: actions.run, resend, reconcile: actions.reconcile, reset: () => dispatch({ type: "reset" }) };
}

export type SpecCommandHook = ReturnType<typeof useSpecCommand>;
