import type { CompozyTaskState } from "../../compozy/compozyGateway";
import type { ExecutionState } from "./executionContracts";
import { attentionReason, failureReason, isAttention, isExhausted, isRetryableFailure, isTerminalFailure, reviewDetail } from "./executionProjectionFacts";

export const CANCELED_STATUS = "canceled";
const COMPLETED_STATUS = "completed";
const APPROVED_OUTCOME = "approved";

export type ProjectionDetail = { agent: string | null; runAttempt: number | null; review: { outcome: string; summary: string | null } | null; blocks: { kind: string; reason: string }[]; attention: string | null };
export type ProjectionAction = "request_review" | "enqueue_continuation" | null;
export type Projection = { state: ExecutionState; detail: ProjectionDetail; failureCode: string | null; failureDetail: string | null; action: ProjectionAction; pullRequestUrl: string | null };
export type ProjectionInput = { task: CompozyTaskState; maxAttempts: number; agent: string; pullRequestUrl: string | null };

export function projectExecution(input: ProjectionInput): Projection {
  const detail = projectionDetail(input);
  const base = { detail, failureCode: null, failureDetail: null, action: null, pullRequestUrl: null };
  const { task } = input;
  if (task.status === CANCELED_STATUS) return { ...base, state: "canceled" };
  if (isApprovedCompletion(task)) return { ...base, state: "completed", pullRequestUrl: input.pullRequestUrl };
  if (isAttention(task)) return { ...base, state: "needs_attention", detail: { ...detail, attention: attentionReason(task) } };
  if (isTerminalFailure(task, input.maxAttempts)) return { ...base, state: "failed", failureCode: failureReason(task, input.maxAttempts), failureDetail: task.latestRun?.error ?? task.latestReview?.summary ?? null };
  return { ...base, state: "in_progress", action: nextAction(task, input.maxAttempts) };
}

function projectionDetail(input: ProjectionInput): ProjectionDetail {
  const run = input.task.latestRun;
  return { agent: run ? input.agent : null, runAttempt: run?.attempt ?? null, review: reviewDetail(input.task), blocks: input.task.openBlocks, attention: null };
}

function isApprovedCompletion(task: CompozyTaskState) {
  const run = task.latestRun;
  return run?.status === COMPLETED_STATUS && task.latestReview?.runId === run.runId && task.latestReview.outcome === APPROVED_OUTCOME;
}

function nextAction(task: CompozyTaskState, maxAttempts: number): ProjectionAction {
  const run = task.latestRun;
  if (run && isRetryableFailure(run.status) && !isExhausted(run.attempt, maxAttempts)) return "enqueue_continuation";
  if (run?.status !== COMPLETED_STATUS) return null;
  const review = task.latestReview?.runId === run.runId ? task.latestReview : null;
  if (!review) return "request_review";
  if (review.outcome === "rejected" && !isExhausted(run.attempt, maxAttempts)) return "enqueue_continuation";
  return null;
}
