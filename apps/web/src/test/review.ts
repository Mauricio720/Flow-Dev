import type { ReviewCycleView, ReviewGetView, ReviewRoundView } from "@/features/issues/assigned-work/reviewContract";
import { AGENTS, OPUS_MAX } from "./terminal";

export const CYCLE_ID = "00000000-0000-4000-8000-0000000000d1";
export const REVIEW_SESSION_ID = "00000000-0000-4000-8000-0000000000e1";
export const EXECUTE_SESSION_ID = "00000000-0000-4000-8000-0000000000e2";
export const SONNET_HIGH = { agent: "claude", model: "sonnet", effort: "high" } as const;

export function roundOf(number: number, patch: Partial<ReviewRoundView> = {}): ReviewRoundView {
  return { number, verdict: "rejected", reportPath: `docs/specs/login/reviews/review-00${number}.md`, reportArtifactId: `00000000-0000-4000-8000-0000000000f${number}`, reviewSessionId: REVIEW_SESSION_ID, executeSessionId: EXECUTE_SESSION_ID, ...patch };
}

export function cycleOf(patch: Partial<ReviewCycleView> = {}): ReviewCycleView {
  return { id: CYCLE_ID, state: "reviewing", partial: false, round: 1, revision: 1, reviewer: OPUS_MAX, executor: OPUS_MAX, step: { role: "review", sessionId: REVIEW_SESSION_ID, sessionStatus: "running" }, sessions: { review: REVIEW_SESSION_ID, execute: null }, pendingAction: null, failure: null, stopReason: null, rounds: [], startedAt: "2026-11-25T10:00:00.000Z", endedAt: null, ...patch };
}

export function reviewOf(cycle: ReviewCycleView | null, patch: Partial<ReviewGetView> = {}): ReviewGetView {
  return { cycle, defaults: { reviewer: OPUS_MAX, executor: OPUS_MAX }, tasks: { total: 7, completed: 7 }, activeSessions: 0, agents: AGENTS, ...patch };
}
