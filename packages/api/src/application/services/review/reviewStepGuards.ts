import type { ReviewCycleWorkerDao } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { TerminalSessionDao } from "../../database/dao/terminalSessionDao";
import type { TaskSetLoader } from "../tasks-set/taskSetLoader";
import { REVIEW_CLAIM_LOST, REVIEW_PLANNING_NOT_APPROVED, REVIEW_TASK_SET_UNREADABLE } from "./reviewCopy";

export type ReviewStepGuardsDeps = {
  cycles: Pick<ReviewCycleWorkerDao, "transition">;
  claims: Pick<IssueClaimDao, "claimByTask">;
  planning: Pick<TerminalSessionDao, "approvedPlanning">;
  taskSets: Pick<TaskSetLoader, "load">;
  finish: (cycle: ReviewCycleRecord, at: Date, reason?: string) => Promise<void>;
  now: () => Date;
};

export class ReviewStepGuards {
  constructor(private readonly deps: ReviewStepGuardsDeps) {}

  async run(cycle: ReviewCycleRecord) {
    const reason = await this.reason(cycle);
    if (!reason) return false;
    const at = this.deps.now();
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: "stopped", stepRole: cycle.stepRole, round: cycle.round, stepStartedAt: null, endedAt: at, failure: null, stopReason: reason } });
    if (updated) await this.deps.finish(updated, at, reason);
    return true;
  }

  private async reason(cycle: ReviewCycleRecord) {
    const claim = await this.deps.claims.claimByTask(cycle.projectId, cycle.taskId);
    if (claim?.state !== "claimed" || claim.operatorUserId !== cycle.startedBy) return REVIEW_CLAIM_LOST;
    if (!await this.deps.planning.approvedPlanning(cycle.taskId)) return REVIEW_PLANNING_NOT_APPROVED;
    const taskSet = await this.deps.taskSets.load(cycle.taskId);
    return taskSet?.problem === null ? null : REVIEW_TASK_SET_UNREADABLE;
  }
}
