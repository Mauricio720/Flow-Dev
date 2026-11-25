import type { ReviewCycleWorkerDao } from "../../database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { ReviewRole } from "./reviewCycleTypes";
import type { SessionLauncher } from "../terminal/sessionLauncher";
import type { SessionLog } from "../terminal/sessionLog";
import { caveatsPrompt, executeInitialPrompt, reviewInitialPrompt } from "./reviewPrompts";
import { elapsedMs, logReview } from "./reviewLog";
import { reviewOpenRequestKey } from "./reviewRequestKeys";
import type { ReviewStepFailure } from "./reviewStepFailure";

const CURRENT_ROUND_OFFSET = 1;

export type ReviewStepOpenDeps = { cycles: Pick<ReviewCycleWorkerDao, "setSession" | "openRound" | "previousReportPath" | "roundVerdict">; launcher: Pick<SessionLauncher, "launch">; failure: Pick<ReviewStepFailure, "failOpen">; hostId: string; now: () => Date; log: SessionLog };
export type ReviewStepOpenInput = { cycle: ReviewCycleRecord; role: ReviewRole; reportPath: string; prompt?: string };

export class ReviewStepOpen {
  constructor(private readonly deps: ReviewStepOpenDeps) {}

  async open(input: ReviewStepOpenInput): Promise<string | null> {
    const { cycle, role } = input;
    const existingId = role === "review" ? cycle.reviewSessionId : cycle.executeSessionId;
    if (existingId) return existingId;
    const stepStartedAt = this.deps.now();
    const launched = await this.launch(input);
    if (!launched) return null;
    const stored = await this.deps.cycles.setSession({ cycleId: cycle.id, role, sessionId: launched.session.id, stepStartedAt });
    if (!stored) return null;
    if (role === "execute" || stored.round > 1) await this.recordRound(stored);
    this.logOpened(stored, role, stepStartedAt);
    return launched.session.id;
  }

  async openMissing(cycle: ReviewCycleRecord): Promise<string | null> {
    const role = cycle.stepRole;
    if (role === "review") return this.open({ cycle, role, reportPath: "" });
    const reportPath = await this.deps.cycles.previousReportPath({ cycleId: cycle.id, round: cycle.round + CURRENT_ROUND_OFFSET });
    if (!reportPath) return null;
    const verdict = await this.deps.cycles.roundVerdict({ cycleId: cycle.id, number: cycle.round });
    const prompt = verdict === "caveats" ? caveatsPrompt({ folder: cycle.tasksFolder, reportPath }) : undefined;
    return this.open({ cycle, role, reportPath, prompt });
  }

  private async launch(input: ReviewStepOpenInput) {
    try {
      return await this.deps.launcher.launch(this.launchInput(input));
    } catch (error) {
      await this.deps.failure.failOpen({ cycle: input.cycle, role: input.role, error, at: this.deps.now() });
      return null;
    }
  }

  private launchInput(input: ReviewStepOpenInput) {
    const { cycle, role } = input;
    const choice = role === "review" ? cycle.reviewer : cycle.executor;
    const prompt = input.prompt ?? (role === "review" ? reviewInitialPrompt({ folder: cycle.tasksFolder, partial: cycle.partial }) : executeInitialPrompt({ folder: cycle.tasksFolder, reportPath: input.reportPath }));
    return { actorId: cycle.startedBy, taskId: cycle.taskId, projectId: cycle.projectId, requestKey: reviewOpenRequestKey({ cycleId: cycle.id, role, attempt: cycle.attempt }), purpose: role === "review" ? "review" as const : "review_execute" as const, reviewCycleId: cycle.id, choice, prompt };
  }

  private recordRound(cycle: ReviewCycleRecord) {
    return this.deps.cycles.openRound({ cycleId: cycle.id, number: cycle.round, reviewSessionId: cycle.reviewSessionId, executeSessionId: cycle.executeSessionId });
  }

  private logOpened(cycle: ReviewCycleRecord, role: ReviewRole, startedAt: Date) {
    const sessionId = role === "review" ? cycle.reviewSessionId : cycle.executeSessionId;
    logReview(this.deps.log, "step_opened", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role, sessionId, durationMs: elapsedMs(startedAt, this.deps.now()) });
  }
}
