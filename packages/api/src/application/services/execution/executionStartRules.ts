import { BLOCKING_UNCERTAINTY_PREFIX, type PlanningRoute } from "../tasks/planningContracts";
import { TaskError } from "../tasks/taskErrors";

export const startBlockers = ["planning_not_approved", "execution_blocked_uncertainty", "binding_not_ready", "repository_archived", "claim_required"] as const;
export type StartBlocker = (typeof startBlockers)[number];

const APPROVED_STATUS = "approved";
const READY_BINDING = "ready";
const DIRECT_ROUTE: PlanningRoute = "direct_execution";

export type StartDecision = { id: string; version: number; status: string; selectedRoute: PlanningRoute; uncertainties: string[] };
export type StartFacts = { decision: StartDecision | null; bindingState: string | null; repositoryArchived: boolean; claimed: boolean };
export type StartRequest = { decisionId: string; expectedDecisionVersion: number };

export function executionStartBlocker(facts: StartFacts): StartBlocker | null {
  if (facts.decision?.status !== APPROVED_STATUS) return "planning_not_approved";
  if (facts.decision.selectedRoute === DIRECT_ROUTE && hasBlockingUncertainty(facts.decision)) return "execution_blocked_uncertainty";
  if (facts.bindingState !== READY_BINDING) return "binding_not_ready";
  if (facts.repositoryArchived) return "repository_archived";
  if (!facts.claimed) return "claim_required";
  return null;
}

export function assertExecutionStartable(facts: StartFacts, request: StartRequest) {
  if (facts.decision?.status !== APPROVED_STATUS) throw new TaskError("planning_not_approved");
  if (facts.decision.id !== request.decisionId || facts.decision.version !== request.expectedDecisionVersion) throw new TaskError("planning_conflict");
  const blocker = executionStartBlocker(facts);
  if (blocker) throw new TaskError(blocker);
  return facts.decision;
}

function hasBlockingUncertainty(decision: StartDecision) {
  return decision.uncertainties.some((uncertainty) => uncertainty.startsWith(BLOCKING_UNCERTAINTY_PREFIX));
}
