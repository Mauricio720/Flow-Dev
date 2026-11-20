import type { CompozyTaskState } from "../../compozy/compozyGateway";

const ATTENTION_STATUSES = ["needs_attention", "blocked"];
const FAILED_RUN_STATUSES = ["failed", "canceled"];
const FAILED_TASK_STATUS = "failed";
const BLOCKING_REVIEW_OUTCOMES = ["blocked", "error", "timeout", "invalid_output"];
const REJECTED_OUTCOME = "rejected";
const ATTEMPTS_EXHAUSTED = "attempts_exhausted";
const RUN_FAILED = "run_failed";

export function isExhausted(attempt: number, maxAttempts: number) {
  return attempt >= maxAttempts;
}

export function isRetryableFailure(runStatus: string) {
  return FAILED_RUN_STATUSES.includes(runStatus);
}

export function isAttention(task: CompozyTaskState) {
  if (task.openBlocks.length > 0) return true;
  if (ATTENTION_STATUSES.includes(task.status) || ATTENTION_STATUSES.includes(task.latestRun?.status ?? "")) return true;
  return currentReview(task)?.outcome ? BLOCKING_REVIEW_OUTCOMES.includes(currentReview(task)!.outcome!) : false;
}

export function attentionReason(task: CompozyTaskState) {
  const block = task.openBlocks[0];
  if (block) return block.reason;
  const review = currentReview(task);
  if (review?.outcome && BLOCKING_REVIEW_OUTCOMES.includes(review.outcome)) return review.summary ?? review.outcome;
  return task.latestRun?.error ?? task.status;
}

export function isTerminalFailure(task: CompozyTaskState, maxAttempts: number) {
  const run = task.latestRun;
  if (task.status === FAILED_TASK_STATUS) return true;
  if (!run || !isExhausted(run.attempt, maxAttempts)) return false;
  return FAILED_RUN_STATUSES.includes(run.status) || currentReview(task)?.outcome === REJECTED_OUTCOME;
}

export function failureReason(task: CompozyTaskState, maxAttempts: number) {
  const exhausted = task.latestRun ? isExhausted(task.latestRun.attempt, maxAttempts) : false;
  return exhausted ? ATTEMPTS_EXHAUSTED : RUN_FAILED;
}

export function reviewDetail(task: CompozyTaskState) {
  const review = task.latestReview;
  return review?.outcome ? { outcome: review.outcome, summary: review.summary } : null;
}

function currentReview(task: CompozyTaskState) {
  return task.latestReview?.runId === task.latestRun?.runId ? task.latestReview : null;
}
