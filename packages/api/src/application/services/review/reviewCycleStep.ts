import type { ReviewCycleWorkerDao } from "../../database/dao/reviewCycleWorkerDao";
import type { SessionLog } from "../terminal/sessionLog";
import type { TickStep } from "../terminal/sessionTickStep";
import type { ReviewStepTurn } from "./reviewStepTurn";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import { logReview } from "./reviewLog";
import type { ReviewStepOpen } from "./reviewStepOpen";
import type { ReviewStepActions } from "./reviewStepActions";
import type { ReviewStepFailure } from "./reviewStepFailure";
import type { ReviewStepGuards } from "./reviewStepGuards";

const ZERO_DURATION_MS = 0;
const FIRST_ROUND = 1;

export type ReviewCycleStepDeps = { cycles: Pick<ReviewCycleWorkerDao, "listForHost">; open: Pick<ReviewStepOpen, "openMissing">; actions: Pick<ReviewStepActions, "run">; guards: Pick<ReviewStepGuards, "run">; failure: Pick<ReviewStepFailure, "run">; turn: Pick<ReviewStepTurn, "run">; hostId: string; log: SessionLog };

export class ReviewCycleStep implements TickStep {
  readonly name = "review";

  constructor(private readonly deps: ReviewCycleStepDeps) {}

  async run() {
    const cycles = await this.deps.cycles.listForHost(this.deps.hostId);
    for (const cycle of cycles) {
      if (await this.deps.guards.run(cycle)) continue;
      await this.deps.actions.run(cycle);
      if (cycle.pendingAction) continue;
      await this.openMissingSession(cycle);
      await this.deps.failure.run(cycle);
      await this.deps.turn.run(cycle);
    }
  }

  private async openMissingSession(cycle: ReviewCycleRecord) {
    if (!needsSession(cycle)) return;
    if (!cycle.stepStartedAt && cycle.round === FIRST_ROUND) this.logStarted(cycle);
    await this.deps.open.openMissing(cycle);
  }

  private logStarted(cycle: ReviewCycleRecord) {
    logReview(this.deps.log, "cycle_started", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role: cycle.stepRole, sessionId: null, durationMs: ZERO_DURATION_MS });
  }
}

function needsSession(cycle: ReviewCycleRecord) {
  if (cycle.pendingAction) return false;
  if (cycle.state !== "reviewing" && cycle.state !== "executing") return false;
  return (cycle.stepRole === "review" ? cycle.reviewSessionId : cycle.executeSessionId) === null;
}
