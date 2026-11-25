import { fieldErrorsOf } from "@/lib/tasks/taskFailure";
import { trpcData } from "@/lib/trpc/error";
import { REVIEW_ACTIVE_MESSAGE, REVIEW_CHANGED_MESSAGE } from "./reviewCopy";

const REVIEW_CHANGED_REASON = "review_cycle_changed";
const REVIEW_ACTIVE_REASON = "review_cycle_active";
const SESSIONS_OPEN_REASON = "review_sessions_open";
const REASON_MESSAGE = new Map([[REVIEW_CHANGED_REASON, REVIEW_CHANGED_MESSAGE], [REVIEW_ACTIVE_REASON, REVIEW_ACTIVE_MESSAGE]]);

export function reviewReasonOf(error: unknown): string | null {
  const data = trpcData(error);
  return data && "reason" in data && typeof data.reason === "string" ? data.reason : null;
}

export function reviewSessionsOpenCount(error: unknown): number | null {
  if (reviewReasonOf(error) !== SESSIONS_OPEN_REASON) return null;
  return Number(fieldErrorsOf(error).count ?? 0);
}

export function reviewFailureMessage(error: unknown, fallback: string): string {
  const reason = reviewReasonOf(error);
  return (reason && REASON_MESSAGE.get(reason)) || (reason && error instanceof Error ? error.message : fallback);
}

export const isReviewChanged = (error: unknown) => reviewReasonOf(error) === REVIEW_CHANGED_REASON;
