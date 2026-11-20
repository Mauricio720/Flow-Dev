import type { ExecutionRecord, SpecReviewRecord } from "../../database/dao/taskExecutionDao";
import type { SpecDecision } from "./executionContracts";
import { TaskError } from "../tasks/taskErrors";

export const SPEC_ROUND_LIMIT = 5;
export const SPEC_ROUND_INCREMENT = 1;
const SPEC_NOTE_LIMIT = 4_000;
const REQUEST_CHANGES = "request_changes";
const REVIEWABLE_STATE = "spec_review";

export type SpecReviewInput = { taskId: string; executionId: string; round: number; decision: SpecDecision; note?: string; idempotencyKey: string; actorId: string };

export function assertReviewable(execution: ExecutionRecord, input: SpecReviewInput) {
  if (input.round !== execution.specRound) throw new TaskError("spec_round_stale");
  if (execution.state !== REVIEWABLE_STATE) throw new TaskError("spec_not_reviewable");
  if (input.decision !== REQUEST_CHANGES) return;
  if (!input.note?.trim() || input.note.length > SPEC_NOTE_LIMIT) throw new TaskError("spec_note_invalid");
  if (input.round >= SPEC_ROUND_LIMIT) throw new TaskError("spec_round_limit");
}

export function normalizedNote(input: SpecReviewInput) {
  return input.decision === REQUEST_CHANGES ? input.note?.trim() ?? null : null;
}

export function assertReviewMatches(review: SpecReviewRecord, input: SpecReviewInput) {
  if (review.executionId !== input.executionId || review.round !== input.round || review.decision !== input.decision || review.note !== normalizedNote(input)) throw new TaskError("request_key_reused");
}
