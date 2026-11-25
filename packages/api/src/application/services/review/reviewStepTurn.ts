import type { ReviewCycleWorkerDao, ReviewSessionTurn } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { SessionLog } from "../terminal/sessionLog";
import { applyStage } from "./reviewCycleRules";
import type { ReviewTransition, ReviewVerdict } from "./reviewCycleTypes";
import { logStageRead } from "./reviewLog";
import type { ReviewMessenger } from "./reviewMessenger";
import { reviewContinuation, executeContinuation } from "./reviewPrompts";
import type { ReviewCycleFinisher } from "./reviewCycleFinisher";
import type { ReviewStageLoader } from "./reviewStageLoader";
import type { ReviewStepOpen } from "./reviewStepOpen";
import { failReviewTurn } from "./reviewStepTurnFailure";

type TurnDao = Pick<ReviewCycleWorkerDao, "sessionTurn" | "openRound" | "recordReview" | "recordExecution" | "transition">;
type ReviewedRound = { cycle: ReviewCycleRecord; reportPath: string; reportVersionId: string; verdict: ReviewVerdict; at: Date };
type Handover = { previous: ReviewCycleRecord; updated: ReviewCycleRecord; reportPath: string; at: Date };

export type ReviewStepTurnDeps = { cycles: TurnDao; loader: Pick<ReviewStageLoader, "review" | "execution">; open: Pick<ReviewStepOpen, "open">; messenger: Pick<ReviewMessenger, "send">; finisher: Pick<ReviewCycleFinisher, "finish">; now: () => Date; log: SessionLog };

function waitsForOperator(next: ReviewTransition) {
  return next.ends || next.state === "caveats";
}

export class ReviewStepTurn {
  constructor(private readonly deps: ReviewStepTurnDeps) {}

  async run(cycle: ReviewCycleRecord) {
    if (!cycle.stepStartedAt || cycle.pendingAction) return;
    if (cycle.stepRole === "review") return this.review(cycle);
    return this.execution(cycle);
  }

  private async review(cycle: ReviewCycleRecord) {
    const turn = await this.completedTurn(cycle, cycle.reviewSessionId);
    if (!turn) return;
    const loaded = await this.deps.loader.review(cycle, turn);
    if (!loaded.ok) return this.fail(cycle, turn, loaded.reason);
    const next = applyStage({ state: cycle.state, role: "review", round: cycle.round }, loaded.stage);
    const at = this.deps.now();
    await this.recordReview({ cycle, reportPath: loaded.reportPath, reportVersionId: loaded.reportVersionId, verdict: next.verdict!, at });
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: next.state, stepRole: next.role, round: next.round, stepStartedAt: waitsForOperator(next) ? null : at, endedBy: next.ends ? null : undefined, endedAt: next.ends ? at : undefined, failure: null } });
    if (!updated) return;
    logStageRead(this.deps.log, { cycle, role: "review", sessionId: cycle.reviewSessionId!, stage: loaded.stage, reportPath: loaded.reportPath, at });
    if (next.state === "executing") await this.continueExecution({ previous: cycle, updated, reportPath: loaded.reportPath, at });
    if (next.ends) await this.deps.finisher.finish(updated, at);
  }

  private async execution(cycle: ReviewCycleRecord) {
    const turn = await this.completedTurn(cycle, cycle.executeSessionId);
    if (!turn) return;
    const loaded = await this.deps.loader.execution(cycle, turn);
    if (!loaded.ok) return this.fail(cycle, turn, loaded.reason);
    const at = this.deps.now();
    const next = applyStage({ state: cycle.state, role: "execute", round: cycle.round }, loaded.stage);
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: next.state, stepRole: next.role, round: next.round, stepStartedAt: at, failure: null } });
    if (!updated) return;
    await this.deps.cycles.recordExecution({ cycleId: cycle.id, number: cycle.round, executeSessionId: cycle.executeSessionId!, executedAt: at });
    await this.deps.cycles.openRound({ cycleId: cycle.id, number: updated.round, reviewSessionId: updated.reviewSessionId, executeSessionId: updated.executeSessionId });
    logStageRead(this.deps.log, { cycle, role: "execute", sessionId: cycle.executeSessionId!, stage: loaded.stage, reportPath: null, at });
    await this.continueReview(updated, at);
  }

  private async completedTurn(cycle: ReviewCycleRecord, sessionId: string | null): Promise<ReviewSessionTurn | null> {
    if (!sessionId) return null;
    const turn = await this.deps.cycles.sessionTurn(sessionId);
    return turn?.pending === false && turn.lastTurnEndedAt && turn.lastTurnEndedAt > cycle.stepStartedAt! ? turn : null;
  }

  private fail(cycle: ReviewCycleRecord, turn: ReviewSessionTurn, reason: string) {
    const sessionId = cycle.stepRole === "review" ? cycle.reviewSessionId! : cycle.executeSessionId!;
    return failReviewTurn({ cycles: this.deps.cycles, cycle, sessionId, reason, turnEndedAt: turn.lastTurnEndedAt!, at: this.deps.now(), log: this.deps.log });
  }

  private async recordReview(input: ReviewedRound) {
    const { cycle, reportPath, reportVersionId, verdict, at } = input;
    await this.deps.cycles.openRound({ cycleId: cycle.id, number: cycle.round, reviewSessionId: cycle.reviewSessionId, executeSessionId: cycle.executeSessionId });
    await this.deps.cycles.recordReview({ cycleId: cycle.id, number: cycle.round, verdict, reportPath, reportVersionId, reviewSessionId: cycle.reviewSessionId!, reviewedAt: at });
  }

  private async continueExecution({ previous, updated, reportPath, at }: Handover) {
    if (!updated.executeSessionId) {
      await this.deps.open.open({ cycle: updated, role: "execute", reportPath });
      return;
    }
    const content = executeContinuation({ folder: previous.tasksFolder, reportPath });
    await this.deps.messenger.send({ cycle: updated, role: "execute", sessionId: updated.executeSessionId, content, round: previous.round, startedAt: at });
  }

  private async continueReview(cycle: ReviewCycleRecord, at: Date) {
    if (!cycle.reviewSessionId) {
      await this.deps.open.open({ cycle, role: "review", reportPath: "" });
      return;
    }
    const content = reviewContinuation({ folder: cycle.tasksFolder, partial: cycle.partial });
    await this.deps.messenger.send({ cycle, role: "review", sessionId: cycle.reviewSessionId, content, round: cycle.round, startedAt: at });
  }
}
