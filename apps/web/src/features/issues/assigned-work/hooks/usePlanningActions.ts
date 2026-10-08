"use client";

import { useState } from "react";
import type { PlanningDecision, PlanningDetail, PlanningRoute } from "../contract";
import { blocksApproval, type ReviewAction } from "../planningCommandState";
import type { ActionContext } from "./actionContext";
import { usePlanningCommand } from "./usePlanningCommand";

type Input = ActionContext & { planning: PlanningDetail };

function reviewCommand(action: ReviewAction, scope: { taskId: string; version: number }, decision: PlanningDecision, route: PlanningRoute) {
  return { action, taskId: scope.taskId, expectedVersion: scope.version, decisionId: decision.id, expectedDecisionVersion: decision.version, route };
}

export function usePlanningActions(context: Input) {
  const [draftRoute, setDraftRoute] = useState<PlanningRoute | null>(null);
  const { command, run, resend, reconcile, reviewed } = usePlanningCommand(context, () => setDraftRoute(null));
  const decision = context.planning.decision;
  const scope = { taskId: context.task?.id ?? "", version: context.task?.version ?? 0 };
  return {
    command, draftRoute, setDraftRoute, reconcile, resend, reviewed,
    start: () => run({ action: "planning.start", taskId: scope.taskId, expectedVersion: scope.version }),
    retry: (failedOperationId: string) => run({ action: "planning.retry", taskId: scope.taskId, expectedVersion: scope.version, failedOperationId }),
    saveRoute: (route: PlanningRoute) => decision && run(reviewCommand("planning.selectRoute", scope, decision, route)),
    approve: () => decision && run(reviewCommand("planning.approve", scope, decision, decision.selectedRoute)),
    dirty: Boolean(decision) && draftRoute !== null && draftRoute !== decision?.selectedRoute,
    approvalBlocked: blocksApproval(command),
  };
}

export type PlanningActions = ReturnType<typeof usePlanningActions>;
