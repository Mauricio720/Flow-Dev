import type { ReviewCycleWorkerDao, ReviewSessionTurn } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { SessionLog } from "../terminal/sessionLog";
import { TaskError } from "../tasks/taskErrors";
import { terminalMessage } from "../terminal/terminalErrorCatalog";
import type { ReviewRole } from "./reviewCycleTypes";
import { SESSION_STEP_INTERRUPTED } from "./reviewCopy";
import { elapsedMs, logReview } from "./reviewLog";

export type ReviewStepFailureDeps = { cycles: Pick<ReviewCycleWorkerDao, "sessionTurn" | "transition">; now: () => Date; log: SessionLog };

export class ReviewStepFailure {
  constructor(private readonly deps: ReviewStepFailureDeps) {}
  async run(cycle: ReviewCycleRecord) {
    if (!cycle.stepStartedAt || cycle.pendingAction || cycle.state === "failed") return;
    const sessionId = cycle.stepRole === "review" ? cycle.reviewSessionId : cycle.executeSessionId;
    if (!sessionId) return;
    const turn = await this.deps.cycles.sessionTurn(sessionId);
    const reason = sessionFailureReason(turn, cycle.stepStartedAt);
    if (reason) await this.persist({ cycle, role: cycle.stepRole, sessionId, reason, at: this.deps.now() });
  }
  async failOpen(input: { cycle: ReviewCycleRecord; role: ReviewRole; error: unknown; at: Date }) {
    const { cycle, role, error, at } = input;
    await this.persist({ cycle, role, sessionId: null, reason: openFailureMessage(error), at });
  }
  private async persist(input: { cycle: ReviewCycleRecord; role: ReviewRole; sessionId: string | null; reason: string; at: Date }) {
    const { cycle, role, sessionId, reason, at } = input;
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: "failed", stepRole: role, round: cycle.round, stepStartedAt: at, failure: reason } });
    if (!updated) return;
    logReview(this.deps.log, "step_failed", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role, sessionId, durationMs: elapsedMs(cycle.stepStartedAt ?? cycle.startedAt, at), reason });
  }
}

function sessionFailureReason(turn: ReviewSessionTurn | null, startedAt: Date) {
  if (!turn) return null;
  if (turn.status === "launch_failed" || turn.launchFailedAt) return turn.launchError ?? SESSION_STEP_INTERRUPTED;
  if (turn.interruptRequestedAt && turn.interruptRequestedAt > startedAt) return SESSION_STEP_INTERRUPTED;
  if (turn.status === "interrupted" && turn.lastSignalAt > startedAt) return SESSION_STEP_INTERRUPTED;
  return turn.status === "ended" ? SESSION_STEP_INTERRUPTED : null;
}

export function openFailureMessage(error: unknown) {
  if (error instanceof TaskError) return error.fieldErrors?.message ?? terminalMessage(error.reason, error.fieldErrors) ?? error.message;
  return error instanceof Error ? error.message : String(error);
}
