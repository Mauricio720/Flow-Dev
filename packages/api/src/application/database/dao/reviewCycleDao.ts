import type { AgentChoice } from "../../terminal/sessionAgentCatalog";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { ReviewAction, ReviewCycleState, ReviewRole, ReviewVerdict } from "../../services/review/reviewCycleTypes";
import type { ReviewCycleView } from "../../services/review/reviewCycleView";

export type ReviewCycleRecord = {
  id: string; taskId: string; projectId: string; hostId: string; startedBy: string; requestKey: string;
  reviewer: AgentChoice; executor: AgentChoice; reviewSessionId: string | null; executeSessionId: string | null;
  tasksFolder: string; partial: boolean; state: ReviewCycleState; round: number; attempt: number; revision: number;
  stepRole: ReviewRole; stepStartedAt: Date | null; pendingAction: ReviewAction | null; pendingBy: string | null;
  pendingAt: Date | null; failure: string | null; stopReason: string | null; endedBy: string | null;
  startedAt: Date; updatedAt: Date; endedAt: Date | null;
};

export type NewReviewCycle = Pick<ReviewCycleRecord, "taskId" | "projectId" | "hostId" | "startedBy" | "requestKey" | "tasksFolder" | "partial"> & { reviewer: AgentChoice; executor: AgentChoice };
export type ReviewRoundView = { number: number; verdict: ReviewVerdict | null; reportPath: string | null; reportArtifactId: string | null; reviewSessionId: string | null; executeSessionId: string | null };
export type ReviewStepView = { role: ReviewRole; sessionId: string | null; sessionStatus: TerminalSessionStatus | null };

export interface ReviewCycleDao {
  findOpen(taskId: string): Promise<ReviewCycleRecord | null>;
  findLatest(taskId: string): Promise<ReviewCycleRecord | null>;
  findByRequestKey(userId: string, requestKey: string): Promise<ReviewCycleRecord | null>;
  create(input: NewReviewCycle): Promise<ReviewCycleRecord>;
  requestAction(input: { cycleId: string; revision: number; action: ReviewAction; by: string; at: Date }): Promise<ReviewCycleRecord | null>;
  view(cycleId: string): Promise<ReviewCycleView | null>;
}
