import type { DeletionStopCoordinator, DeletionStopDeps, StopOutcome } from "./deletionStop";
import { logReview } from "../review/reviewLog";
const ZERO_DURATION_MS = 0;

export class CoordinatedDeletionStop implements DeletionStopCoordinator {
  constructor(private readonly deps: DeletionStopDeps) {}

  async stopTask(taskId: string, deletionOperationId: string): Promise<StopOutcome> {
    const stoppedCycles = await this.deps.dao.cancelTaskWork(taskId, deletionOperationId);
    for (const cycle of stoppedCycles) logReview(this.deps.log, "cycle_finished", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role: cycle.stepRole, sessionId: cycle.stepRole === "review" ? cycle.reviewSessionId : cycle.executeSessionId, durationMs: Math.max(ZERO_DURATION_MS, Date.now() - cycle.startedAt.getTime()) });
    const remaining = await this.deps.dao.remainingActiveWork(taskId);
    if (remaining.operations.length || remaining.specs.length || remaining.runs.length || remaining.reviewSessions.length) {
      return { workStopped: false, reason: "unknown_stop" };
    }
    return { workStopped: true, reason: null };
  }
}
