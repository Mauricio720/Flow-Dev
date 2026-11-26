import { FINAL_SESSION_STATUSES, isActiveSession, type TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { SessionPurposeKind } from "../../terminal/sessionPurposeKind";
import type { RouteSwitchDiscardReason, RouteSwitchState, RouteSwitchStatus } from "../../terminal/routeSwitch";
import type { PlanningRoute } from "./planningContracts";

export type ProposalFacts = {
  purpose: SessionPurposeKind;
  sessionRoute: PlanningRoute;
  sessionStatus: TerminalSessionStatus;
  hasConfirmedSwitch: boolean;
  hasCapturedSpec: boolean;
  hasPendingProposal: boolean;
  lastDeclinedAt: Date | null;
  lastAnsweredAt: Date | null;
};
export type ProposalVerdict = { kind: "accept" } | { kind: "ignore" } | { kind: "discard"; reason: RouteSwitchDiscardReason };

function isEligibleSession(facts: ProposalFacts): boolean {
  return facts.purpose === "route" && facts.sessionRoute !== "direct_execution" && isActiveSession(facts.sessionStatus);
}

function wasAnsweredAfterDecline(facts: ProposalFacts): boolean {
  return facts.lastDeclinedAt === null || (facts.lastAnsweredAt !== null && facts.lastAnsweredAt > facts.lastDeclinedAt);
}

export function evaluateProposal(facts: ProposalFacts): ProposalVerdict {
  if (!isEligibleSession(facts) || facts.hasPendingProposal) return { kind: "ignore" };
  if (facts.hasConfirmedSwitch) return { kind: "discard", reason: "already_switched" };
  if (facts.hasCapturedSpec) return { kind: "discard", reason: "spec_exists" };
  if (!wasAnsweredAfterDecline(facts)) return { kind: "discard", reason: "declined_without_answer" };
  return { kind: "accept" };
}

export function routeSwitchState(status: RouteSwitchStatus, sessionStatus: TerminalSessionStatus): RouteSwitchState {
  return status === "pending" && FINAL_SESSION_STATUSES.has(sessionStatus) ? "expired" : status;
}

export function effectiveRoute(input: { approvedRoute: PlanningRoute; currentDecisionId: string; confirmedSwitch: { planningDecisionId: string } | null }): PlanningRoute {
  return input.confirmedSwitch?.planningDecisionId === input.currentDecisionId ? "direct_execution" : input.approvedRoute;
}
