"use client";

import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import { commandReducer, IDLE_COMMAND, keyedCommand, withoutKey, type PendingCommand, type UnkeyedCommand } from "../planningCommandState";
import { dispatchPlanning, observePlanningSubmission } from "../planningClient";
import { clearPending, loadPending, savePending } from "../planningPendingStore";
import { isPlanningUnconfirmed, taskFailure } from "../taskFailure";
import type { ActionContext } from "./actionContext";

const CONFLICT_REASON = "planning_conflict";

export function usePlanningCommand(context: ActionContext, onSettled: () => void) {
  const [command, dispatch] = useReducer(commandReducer, IDLE_COMMAND);
  const latest = useRef(command);
  useEffect(() => { latest.current = command; }, [command]);
  async function settle(pending: PendingCommand) {
    clearPending(pending.taskId);
    await context.onChanged();
    dispatch({ type: "accepted" });
    onSettled();
  }
  function fail(error: unknown, pending: PendingCommand) {
    const failure = taskFailure(error);
    context.onFailure(failure);
    if (isPlanningUnconfirmed(failure)) return dispatch({ type: "unconfirmed" });
    clearPending(pending.taskId);
    onSettled();
    if (failure.reason !== CONFLICT_REASON) return dispatch({ type: "rejected", failure });
    dispatch({ type: "conflict" });
    void context.onChanged();
  }
  async function run(base: UnkeyedCommand) {
    if (latest.current.phase === "sending") return;
    const pending = keyedCommand(latest.current, base);
    savePending(pending);
    dispatch({ type: "begin", pending });
    try {
      await dispatchPlanning(context, pending);
      await settle(pending);
    } catch (error) {
      fail(error, pending);
    }
  }
  async function reconcileFor(pending: PendingCommand | null) {
    if (!pending) return;
    try {
      const result = await observePlanningSubmission(context, pending);
      if (result.status === "accepted") await settle(pending);
      else dispatch({ type: "not_accepted" });
    } catch (error) {
      fail(error, pending);
    }
  }
  const restore = useEffectEvent((taskId: string) => {
    const pending = loadPending(taskId);
    if (!pending) return;
    dispatch({ type: "begin", pending });
    dispatch({ type: "unconfirmed" });
    void reconcileFor(pending);
  });
  const taskId = context.task?.id;
  useEffect(() => { if (taskId) restore(taskId); }, [taskId]);
  const resend = () => { const pending = latest.current.pending; if (pending) void run(withoutKey(pending)); };
  return { command, run, resend, reconcile: () => reconcileFor(latest.current.pending), reviewed: () => { dispatch({ type: "reviewed" }); onSettled(); } };
}
