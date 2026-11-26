import type { PlanningRoute } from "../../services/tasks/planningContracts";
import type { RouteSwitchDecision, RouteSwitchFromRoute, RouteSwitchStatus } from "../../terminal/routeSwitch";
import type { SessionPurposeKind } from "../../terminal/sessionPurposeKind";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export type RouteSwitchRecord = {
  id: string;
  taskId: string;
  planningDecisionId: string;
  sessionId: string;
  fromRoute: RouteSwitchFromRoute;
  toRoute: "direct_execution";
  summary: string;
  reasons: string[];
  status: RouteSwitchStatus;
  decidedByUserId: string | null;
  decidedByName: string | null;
  decidedAt: Date | null;
  decisionRequestKey: string | null;
  proposedAt: Date;
};

export type ProposalContext = {
  session: { id: string; taskId: string; projectId: string; purpose: SessionPurposeKind; route: PlanningRoute; status: TerminalSessionStatus };
  currentDecisionId: string | null;
  hasConfirmedSwitch: boolean;
  hasCapturedSpec: boolean;
  hasPendingProposal: boolean;
  lastDeclinedAt: Date | null;
  lastAnsweredAt: Date | null;
};
export type InsertPendingInput = { taskId: string; planningDecisionId: string; sessionId: string; fromRoute: RouteSwitchFromRoute; summary: string; reasons: string[]; proposedAt: Date };
export type DecideInput = { proposalId: string; sessionId: string; decision: RouteSwitchDecision; actorId: string; requestKey: string; decidedAt: Date; message: string };
export type DecideOutcome = { outcome: "decided" | "replayed" | "already_decided" | "not_found"; record: RouteSwitchRecord | null };

export interface RouteSwitchDao {
  readProposalContext(sessionId: string): Promise<ProposalContext | null>;
  insertPending(input: InsertPendingInput): Promise<{ created: boolean; record: RouteSwitchRecord }>;
  decide(input: DecideInput): Promise<DecideOutcome>;
  findById(id: string): Promise<RouteSwitchRecord | null>;
  listByTask(taskId: string): Promise<RouteSwitchRecord[]>;
  findConfirmedForDecision(planningDecisionId: string): Promise<RouteSwitchRecord | null>;
}
