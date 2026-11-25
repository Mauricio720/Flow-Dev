import type { ReviewCycleRecord } from "./reviewCycleDao";
import type { ReviewAction, ReviewCycleState, ReviewRole, ReviewVerdict } from "../../services/review/reviewCycleTypes";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export type ReviewCycleNext = { state: ReviewCycleState; stepRole: ReviewRole; round: number; stepStartedAt: Date | null; endedBy?: string | null; endedAt?: Date | null; failure?: string | null; stopReason?: string | null; attempt?: number; reviewSessionId?: string | null; executeSessionId?: string | null };
export type ReviewSessionTurn = { taskId: string; projectId: string; checkoutPath: string; status: TerminalSessionStatus; interruptRequestedAt: Date | null; endRequestedAt: Date | null; endedAt: Date | null; launchFailedAt: Date | null; launchError: string | null; lastSignalAt: Date; lastTurnEndedAt: Date | null; pending: boolean; edits: { sessionId: string; path: string; at: Date }[] };

export interface ReviewCycleWorkerDao {
  listForHost(hostId: string): Promise<ReviewCycleRecord[]>;
  setSession(input: { cycleId: string; role: ReviewRole; sessionId: string; stepStartedAt: Date }): Promise<ReviewCycleRecord | null>;
  transition(input: { cycleId: string; revision: number; next: ReviewCycleNext }): Promise<ReviewCycleRecord | null>;
  openRound(input: { cycleId: string; number: number; reviewSessionId: string | null; executeSessionId: string | null }): Promise<void>;
  recordReview(input: { cycleId: string; number: number; verdict: ReviewVerdict; reportPath: string; reportVersionId: string; reviewSessionId: string; reviewedAt: Date }): Promise<void>;
  recordExecution(input: { cycleId: string; number: number; executeSessionId: string; executedAt: Date }): Promise<void>;
  clearPending(input: { cycleId: string; revision: number; at: Date }): Promise<ReviewCycleRecord | null>;
  sessionTurn(sessionId: string): Promise<ReviewSessionTurn | null>;
  previousReportPath(input: { cycleId: string; round: number }): Promise<string | null>;
  reportVersionId(input: { taskId: string; path: string }): Promise<string | null>;
  roundVerdict(input: { cycleId: string; number: number }): Promise<ReviewVerdict | null>;
  activeSessionIds(cycleId: string): Promise<string[]>;
}

export type ReviewPendingAction = ReviewAction;
