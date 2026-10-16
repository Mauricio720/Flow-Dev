import type { DeletionStopCoordinator, DeletionStopDeps, StopOutcome } from "./deletionStop";

export class CoordinatedDeletionStop implements DeletionStopCoordinator {
  constructor(private readonly deps: DeletionStopDeps) {}

  async stopTask(taskId: string, deletionOperationId: string): Promise<StopOutcome> {
    await this.deps.dao.cancelTaskWork(taskId, deletionOperationId);
    const remaining = await this.deps.dao.remainingActiveWork(taskId);
    if (remaining.runs.length && this.deps.runs) {
      await this.deps.runs.cancelActiveRuns(taskId);
      const settled = await this.deps.dao.remainingActiveWork(taskId);
      if (settled.operations.length || settled.specs.length || settled.runs.length) return { workStopped: false, reason: "unknown_stop" };
      return { workStopped: true, reason: null };
    }
    if (remaining.operations.length || remaining.specs.length || remaining.runs.length) {
      return { workStopped: false, reason: "unknown_stop" };
    }
    return { workStopped: true, reason: null };
  }
}
