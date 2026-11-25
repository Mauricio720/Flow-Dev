import type { ReviewCycleWorkerDao } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { SessionControlDao } from "../../terminal/sessionInteractionPorts";
import type { SessionLog } from "../terminal/sessionLog";
import { elapsedMs, logReview } from "./reviewLog";

export type ReviewCycleFinisherDeps = { cycles: Pick<ReviewCycleWorkerDao, "activeSessionIds">; controls: Pick<SessionControlDao, "requestEnd">; log: SessionLog };

export class ReviewCycleFinisher {
  constructor(private readonly deps: ReviewCycleFinisherDeps) {}

  async finish(cycle: ReviewCycleRecord, at: Date, reason?: string) {
    const registered = [cycle.reviewSessionId, cycle.executeSessionId].filter((id): id is string => id !== null);
    const launched = await this.deps.cycles.activeSessionIds(cycle.id);
    for (const sessionId of new Set([...registered, ...launched])) await this.deps.controls.requestEnd(sessionId, at);
    const sessionId = cycle.stepRole === "review" ? cycle.reviewSessionId : cycle.executeSessionId;
    logReview(this.deps.log, "cycle_finished", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role: cycle.stepRole, sessionId, durationMs: elapsedMs(cycle.startedAt, at), ...(reason ? { reason } : {}) });
  }
}
