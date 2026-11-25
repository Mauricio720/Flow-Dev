import type { ReviewCycleWorkerDao, ReviewSessionTurn } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import { applyAction } from "./reviewCycleRules";
import type { ReviewRole } from "./reviewCycleTypes";
import type { ReviewMessenger } from "./reviewMessenger";
import { caveatsPrompt } from "./reviewPrompts";
import { retryPrompt } from "./reviewRetryPrompt";
import type { ReviewStepOpen } from "./reviewStepOpen";

const CURRENT_ROUND_OFFSET = 1;
const NO_NEW_ATTEMPT = 0;
const NEW_ATTEMPT = 1;

export type ReviewStepActionsDeps = { cycles: Pick<ReviewCycleWorkerDao, "transition" | "previousReportPath" | "sessionTurn" | "roundVerdict">; open: Pick<ReviewStepOpen, "open">; messenger: Pick<ReviewMessenger, "send">; finish: (cycle: ReviewCycleRecord, at: Date) => Promise<void>; now: () => Date };

export class ReviewStepActions {
  constructor(private readonly deps: ReviewStepActionsDeps) {}

  async run(cycle: ReviewCycleRecord) {
    const action = cycle.pendingAction;
    if (action === "stop") return this.stop(cycle);
    if (action === "retry") return this.retry(cycle);
    if (action === "accept") return this.accept(cycle);
    if (action === "fix") return this.fix(cycle);
  }

  private latestReport(cycle: ReviewCycleRecord) {
    return this.deps.cycles.previousReportPath({ cycleId: cycle.id, round: cycle.round + CURRENT_ROUND_OFFSET });
  }

  private async stop(cycle: ReviewCycleRecord) {
    const at = this.deps.now();
    const next = applyAction({ state: cycle.state, role: cycle.stepRole, round: cycle.round }, "stop");
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: next.state, stepRole: next.role, round: next.round, stepStartedAt: null, endedBy: cycle.pendingBy, endedAt: at, failure: null } });
    if (updated) await this.deps.finish(updated, at);
  }

  private async accept(cycle: ReviewCycleRecord) {
    const at = this.deps.now();
    const next = applyAction({ state: cycle.state, role: cycle.stepRole, round: cycle.round }, "accept");
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: next.state, stepRole: next.role, round: next.round, stepStartedAt: null, endedBy: cycle.pendingBy, endedAt: at, failure: null } });
    if (updated) await this.deps.finish(updated, at);
  }

  private async fix(cycle: ReviewCycleRecord) {
    const reportPath = await this.latestReport(cycle);
    if (!reportPath) return;
    const at = this.deps.now();
    const next = applyAction({ state: cycle.state, role: cycle.stepRole, round: cycle.round }, "fix");
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: next.state, stepRole: next.role, round: next.round, stepStartedAt: at, failure: null } });
    if (!updated) return;
    const content = caveatsPrompt({ folder: updated.tasksFolder, reportPath });
    if (!updated.executeSessionId) return void await this.deps.open.open({ cycle: updated, role: "execute", reportPath, prompt: content });
    await this.deps.messenger.send({ cycle: updated, role: "execute", sessionId: updated.executeSessionId, content, round: updated.round, startedAt: at });
  }

  private async retry(cycle: ReviewCycleRecord) {
    const role = cycle.stepRole;
    const reportPath = role === "execute" ? await this.latestReport(cycle) : null;
    if (role === "execute" && !reportPath) return;
    const sessionId = role === "review" ? cycle.reviewSessionId : cycle.executeSessionId;
    const replace = needsReplacement(sessionId, sessionId ? await this.deps.cycles.sessionTurn(sessionId) : null);
    const at = this.deps.now();
    const next = applyAction({ state: cycle.state, role, round: cycle.round }, "retry");
    const cleared = role === "review" ? { reviewSessionId: null } : { executeSessionId: null };
    const attempt = cycle.attempt + (replace ? NEW_ATTEMPT : NO_NEW_ATTEMPT);
    const updated = await this.deps.cycles.transition({ cycleId: cycle.id, revision: cycle.revision, next: { state: next.state, stepRole: next.role, round: next.round, stepStartedAt: at, failure: null, attempt, ...(replace ? cleared : {}) } });
    if (!updated) return;
    if (replace) return void await this.deps.open.open({ cycle: updated, role, reportPath: reportPath ?? "" });
    if (sessionId) await this.sendRetry({ cycle: updated, role, sessionId, reportPath, at });
  }

  private async sendRetry(input: { cycle: ReviewCycleRecord; role: ReviewRole; sessionId: string; reportPath: string | null; at: Date }) {
    const { cycle, role, sessionId, reportPath, at } = input;
    const verdict = await this.deps.cycles.roundVerdict({ cycleId: cycle.id, number: cycle.round });
    const content = retryPrompt({ cycle, role, reportPath, verdict });
    await this.deps.messenger.send({ cycle, role, sessionId, content, round: cycle.round, startedAt: at });
  }
}

function needsReplacement(sessionId: string | null, turn: ReviewSessionTurn | null) {
  return !sessionId || !turn || turn.status === "ended" || turn.status === "launch_failed";
}
