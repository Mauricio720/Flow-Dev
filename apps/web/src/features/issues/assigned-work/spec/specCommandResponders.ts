import type { Dispatch } from "react";
import { isPlanningUnconfirmed, taskFailure } from "@/lib/tasks/taskFailure";
import type { PendingSpecCommand, SpecCommandEvent } from "./specCommandState";
import type { SpecFailure } from "./specContract";
import { observeSpecSubmission } from "./specDispatch";
import { clearSpecPending, type PendingScope } from "./specPendingStore";

export type SpecResponderContext = { scope: PendingScope; dispatch: Dispatch<SpecCommandEvent>; onChanged: () => Promise<void> | void; onFailure: (failure: SpecFailure) => void };
const CONFLICT_REASONS = ["spec_conflict", "interaction_stale", "interaction_resolved", "attempt_active", "stage_approved"];

export function createSpecResponders({ scope, dispatch, onChanged, onFailure }: SpecResponderContext) {
  const target = { projectId: scope.projectId, taskId: scope.taskId };
  async function settle() {
    clearSpecPending(scope);
    dispatch({ type: "applied" });
    await onChanged();
  }
  function fail(error: unknown) {
    const failure = taskFailure(error);
    onFailure(failure);
    if (isPlanningUnconfirmed(failure)) return dispatch({ type: "unconfirmed" });
    clearSpecPending(scope);
    if (failure.reason && CONFLICT_REASONS.includes(failure.reason)) { dispatch({ type: "conflict" }); void onChanged(); return; }
    dispatch({ type: "rejected", failure });
  }
  async function observe(pending: PendingSpecCommand) {
    const result = await observeSpecSubmission(target, pending);
    if (result.status === "unknown") return dispatch({ type: "not_accepted" });
    if (result.receipt.status === "applied") return settle();
    if (result.receipt.status === "rejected") return rejectReceipt(result.receipt.reason);
    dispatch({ type: "accepted", asynchronous: true });
  }
  function rejectReceipt(reason: string | null) {
    clearSpecPending(scope);
    const failure = { code: null, reason };
    onFailure(failure);
    dispatch({ type: "rejected", failure });
    return onChanged();
  }
  return { settle, fail, observe };
}
