import type { AgentChoice, AgentAvailability } from "../../terminal/sessionAgentCatalog";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { ReviewAction, ReviewCycleState, ReviewRole, ReviewVerdict } from "./reviewCycleTypes";

export type ReviewStep = { role: ReviewRole; sessionId: string | null; sessionStatus: TerminalSessionStatus | null };
export type ReviewRoundView = { number: number; verdict: ReviewVerdict | null; reportPath: string | null; reportArtifactId: string | null; reviewSessionId: string | null; executeSessionId: string | null };
export type ReviewCycleView = {
  id: string; state: ReviewCycleState; partial: boolean; round: number; revision: number; reviewer: AgentChoice; executor: AgentChoice;
  step: ReviewStep; sessions: { review: string | null; execute: string | null }; pendingAction: ReviewAction | null;
  failure: string | null; stopReason: string | null; rounds: ReviewRoundView[]; startedAt: string; endedAt: string | null;
};
export type ReviewGetView = { cycle: ReviewCycleView | null; defaults: { reviewer: AgentChoice; executor: AgentChoice }; tasks: { total: number; completed: number }; activeSessions: number; agents: AgentAvailability[] };
