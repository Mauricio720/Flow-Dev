import type { ReviewCycleWorkerDao } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { SessionLog } from "../terminal/sessionLog";
import { elapsedMs, logReview } from "./reviewLog";

export async function failReviewTurn(input: { cycles: Pick<ReviewCycleWorkerDao, "transition">; cycle: ReviewCycleRecord; sessionId: string; reason: string; turnEndedAt: Date; at: Date; log: SessionLog }) {
  const { cycles, cycle, sessionId, reason, turnEndedAt, at, log } = input;
  const updated = await cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: "failed", stepRole: cycle.stepRole, round: cycle.round, stepStartedAt: turnEndedAt, failure: reason } });
  if (!updated) return;
  logReview(log, "step_failed", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role: cycle.stepRole, sessionId, durationMs: elapsedMs(cycle.stepStartedAt!, at), reason });
}
