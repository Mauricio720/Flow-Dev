export type ReviewCycleState = "reviewing" | "executing" | "caveats" | "failed" | "approved" | "accepted" | "stopped";
export type ReviewRole = "review" | "execute";
export type ReviewAction = "stop" | "retry" | "accept" | "fix";
export type ReviewStage = "execute" | "aprovada" | "ressalvas" | "review";
export type ReviewVerdict = "approved" | "caveats" | "rejected";
export type ReviewTransition = { state: ReviewCycleState; role: ReviewRole; round: number; verdict: ReviewVerdict | null; ends: boolean };

export const FINAL_REVIEW_STATES = ["approved", "accepted", "stopped"] as const;

export function isFinalReviewState(state: ReviewCycleState) {
  return FINAL_REVIEW_STATES.includes(state as (typeof FINAL_REVIEW_STATES)[number]);
}
