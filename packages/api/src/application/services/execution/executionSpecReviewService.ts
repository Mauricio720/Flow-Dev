import type { SpecReviewInsert, SpecReviewRecord, TaskExecutionDao, ExecutionRecord } from "../../database/dao/taskExecutionDao";
import type { CompozyGateway } from "../../compozy/compozyGateway";
import { TaskError } from "../tasks/taskErrors";
import { activeExecutionStates, isTerminalExecution } from "./executionContracts";
import { logExecutionEvent } from "./executionLog";
import { SPEC_ROUND_METADATA } from "./executionPlan";
import { hasMainSpecFile } from "./executionSpecFiles";
import { assertReviewMatches, assertReviewable, normalizedNote, SPEC_ROUND_INCREMENT, type SpecReviewInput } from "./executionSpecReviewRules";
import { cancelExecutionTasks } from "./executionTaskCancellation";

const APPROVE = "approve";
const REQUEST_CHANGES = "request_changes";
const SPEC_REVIEW_STATE = "spec_review";
const IN_PROGRESS_STATE = "in_progress";
const SPEC_IN_PROGRESS_STATE = "spec_in_progress";
const REJECTED_STATE = "rejected";
type ReviewGateway = Pick<CompozyGateway, "approveTask" | "enqueueRun" | "listFileEntries" | "cancelTask" | "readTask">;
type ReviewDeps = { dao: TaskExecutionDao; gateway: ReviewGateway; clock: () => Date };

export class ExecutionSpecReviewService {
  constructor(private readonly deps: ReviewDeps) {}

  async review(input: SpecReviewInput) {
    const execution = await this.deps.dao.findById(input.taskId, input.executionId);
    if (!execution) throw new TaskError("execution_not_found");
    const existing = await this.deps.dao.findSpecReviewByKey(input.idempotencyKey);
    if (existing) return this.replay(execution, existing, input);
    assertReviewable(execution, input);
    await this.requireMainSpec(execution, input);
    const review = await this.deps.dao.insertSpecReview(reviewInsert(input));
    if (!review) return this.recoverConcurrentReview(execution, input);
    return this.apply(execution, review, false);
  }

  private async replay(execution: ExecutionRecord, review: SpecReviewRecord, input: SpecReviewInput) {
    assertReviewMatches(review, input);
    if (reviewIsSettled(execution, review)) return result(execution, true);
    return this.apply(execution, review, true);
  }

  private async recoverConcurrentReview(execution: ExecutionRecord, input: SpecReviewInput) {
    const review = await this.deps.dao.findSpecReviewByKey(input.idempotencyKey);
    if (!review) throw new TaskError("spec_round_stale");
    assertReviewMatches(review, input);
    return this.apply(execution, review, true);
  }

  private async requireMainSpec(execution: ExecutionRecord, input: SpecReviewInput) {
    if (input.decision !== APPROVE) return;
    if (!execution.specDir || !execution.specWorktreeId || !(await hasMainSpecFile(this.deps.gateway, specFilesInput(execution)))) throw new TaskError("spec_missing_main_file");
  }

  private async apply(execution: ExecutionRecord, review: SpecReviewRecord, replayed: boolean) {
    if (review.decision === APPROVE) await this.approve(execution, review);
    else if (review.decision === REQUEST_CHANGES) await this.requestChanges(execution, review);
    else await cancelExecutionTasks(this.deps.gateway, execution);
    const state = review.decision === APPROVE ? IN_PROGRESS_STATE : review.decision === REQUEST_CHANGES ? SPEC_IN_PROGRESS_STATE : REJECTED_STATE;
    const specRound = review.decision === REQUEST_CHANGES ? review.round + SPEC_ROUND_INCREMENT : review.round;
    const settled = await this.persist(execution, state, specRound);
    logExecutionEvent("execution.spec_review", { executionId: execution.id, round: review.round, decision: review.decision });
    return { state: settled.state, specRound: settled.specRound, replayed };
  }

  private async approve(execution: ExecutionRecord, review: SpecReviewRecord) {
    if (!execution.workTaskId) throw new TaskError("spec_not_reviewable");
    await this.deps.gateway.approveTask({ taskId: execution.workTaskId, idempotencyKey: review.idempotencyKey });
  }

  private async requestChanges(execution: ExecutionRecord, review: SpecReviewRecord) {
    if (!execution.specTaskId || !review.note) throw new TaskError("spec_not_reviewable");
    const nextRound = review.round + SPEC_ROUND_INCREMENT;
    await this.deps.gateway.enqueueRun({ taskId: execution.specTaskId, idempotencyKey: review.idempotencyKey, metadata: { round: String(nextRound), note: review.note, [SPEC_ROUND_METADATA]: String(nextRound) } });
  }

  private async persist(execution: ExecutionRecord, state: typeof IN_PROGRESS_STATE | typeof SPEC_IN_PROGRESS_STATE | typeof REJECTED_STATE, specRound: number) {
    const now = this.deps.clock();
    const patch = { state, specRound, lastSyncedAt: now, finishedAt: state === "rejected" ? now : null };
    return (await this.deps.dao.transition({ id: execution.id, from: activeExecutionStates, patch })) ?? (await this.deps.dao.findById(execution.taskId, execution.id)) ?? execution;
  }
}

function reviewInsert(input: SpecReviewInput): SpecReviewInsert {
  return { executionId: input.executionId, round: input.round, decision: input.decision, note: normalizedNote(input), actorId: input.actorId, idempotencyKey: input.idempotencyKey };
}

function reviewIsSettled(execution: ExecutionRecord, review: SpecReviewRecord) {
  if (isTerminalExecution(execution.state)) return true;
  if (review.decision === APPROVE) return execution.state !== SPEC_REVIEW_STATE;
  return review.decision === REQUEST_CHANGES ? execution.specRound > review.round : false;
}

function specFilesInput(execution: ExecutionRecord) {
  return { workspaceId: execution.compozyWorkspaceId, worktreeId: execution.specWorktreeId!, specDir: execution.specDir! };
}

function result(execution: ExecutionRecord, replayed: boolean) {
  return { state: execution.state, specRound: execution.specRound, replayed };
}
